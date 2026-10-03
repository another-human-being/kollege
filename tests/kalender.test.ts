// Stage 6, writing (§6, E10/E28/E48) against Radicale and a recording SMTP server: events go into
// the calendar, changes keep what Apple/Outlook stored, conflicts never overwrite, invitations and
// cancellations go out only by a person's click (never the model), recallable for 10 s.
import { eq } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { createDAVClient, type DAVCalendar } from 'tsdav';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction, undoAction } from '@/lib/actions';
import { kalenderVerbinden } from '@/lib/connectors/kalender-einrichten';
import { encrypt } from '@/lib/crypto';
import { closeDb, withSystem } from '@/lib/db/client';
import { actions, connections, entries, eventCopies } from '@/lib/db/schema';
import { kalenderSchreiben } from '@/lib/kalender/schreiben';
import { sendeTermin } from '@/lib/kalender/senden';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { expectRejects, importFixtures, NOW } from './helpers';
import { RADICALE, startRadicale, type Testkalender } from './radicale';
import { smtpServer } from './smtp';
import { termine } from '@/lib/views/kalender';

process.env.APP_SECRET ??= 'test-app-secret-0123456789abcdef0123';

const fast = () => new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: 'text', text: JSON.stringify({ relevant: true, confidence: 'high', summary: 'Termin.', matter: null, people: [], tasks: [] }) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
    warnings: [],
  }),
});
const unfold = (s: string) => s.replace(/\r\n[ \t]/g, '');

describe.skipIf(!RADICALE)('Stufe 6: Termine schreiben und einladen', () => {
  let srv: Testkalender;
  let smtp: Awaited<ReturnType<typeof smtpServer>>;
  let dav: Awaited<ReturnType<typeof createDAVClient>>;
  let arbeit: DAVCalendar;
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  let kalId: string;
  const andreas = () => ({ type: 'user' as const, userId: fx.users.andreas! });
  const model = () => ({ type: 'model' as const, userId: fx.users.andreas! });
  const objekte = async () => (await dav.fetchCalendarObjects({ calendar: arbeit })).map((o) => ({ url: o.url, etag: o.etag, data: unfold(String(o.data)) }));
  const meta = async (id: string) => (await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, id))))[0]!.meta as Record<string, unknown>;
  const termin = (extra: Record<string, unknown> = {}) =>
    runAction<{ id: string }>(andreas(), 'event.create', { title: 'Beratung', start: '2026-10-12T08:00:00Z', end: '2026-10-12T09:00:00Z', ...extra });

  beforeAll(async () => {
    fx = await importFixtures();
    srv = await startRadicale();
    smtp = await smtpServer('andreas', 'post');
    dav = await createDAVClient({ serverUrl: srv.url, credentials: { username: srv.user, password: srv.password }, authMethod: 'Basic', defaultAccountType: 'caldav' });
    await dav.makeCalendar({ url: `${srv.url}${srv.user}/arbeit/`, props: { displayname: 'Arbeit' } });
    arbeit = (await dav.fetchCalendars()).find((c) => c.displayName === 'Arbeit')!;
    // an Apple event with an alarm Kollege does not know about
    await dav.createCalendarObject({ calendar: arbeit, filename: 'apple.ics', iCalString: [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apple//', 'BEGIN:VEVENT', 'UID:apple-2@icloud', 'DTSTAMP:20260930T080000Z',
      'DTSTART:20261014T080000Z', 'DTEND:20261014T090000Z', 'SUMMARY:Lehrplanung',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', 'DESCRIPTION:x', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n') });
    ({ id: kalId } = await kalenderVerbinden({ url: srv.url, user: srv.user, password: srv.password, ownerEmail: 'andreas@gruendung.uni-augsburg.example', importSince: '2026-01-01' }));
    // invitations go over Andreas' mailbox (SMTP only is needed here)
    await withSystem((tx) => tx.insert(connections).values({
      user_id: fx.users.andreas, kind: 'mail', provider: 'imap', label: 'Postfach Andreas', status: 'ok', cursor: { folders: {} },
      config: { host: '127.0.0.1', port: 1, secure: false, user: 'andreas', password: encrypt('post'), address: 'andreas@gruendung.uni-augsburg.example', smtp: { host: '127.0.0.1', port: smtp.port, secure: false } },
    }));
    await runImport([kalId], { model: fast(), now: NOW, importId: 'kalender-schreiben' });
  }, 120_000);

  afterAll(async () => {
    await smtp?.close();
    await srv?.stop();
    await closeDb();
  });

  it('an event without attendees goes straight into the calendar; the next sync does not double it', async () => {
    const { result } = await termin({ title: 'Schreibzeit', location: 'Büro' });
    expect((await kalenderSchreiben(kalId)).fehler).toEqual([]);
    const o = (await objekte()).find((x) => x.data.includes('SUMMARY:Schreibzeit'))!;
    expect(o.data).toContain('LOCATION:Büro');
    const r = await syncConnection(kalId, { now: NOW });
    expect(r.newEntryIds).toHaveLength(0);
    const [copy] = await withSystem((tx) => tx.select().from(eventCopies).where(eq(eventCopies.entry_id, result.id)));
    expect(copy).toMatchObject({ pending: false, href: o.url });
  });

  it('a change keeps what Apple stored (the alarm) and goes to the server', async () => {
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, 'apple-2@icloud')));
    await runAction(andreas(), 'event.update', { id: e!.id, title: 'Lehrplanung WS', start: '2026-10-14T09:00:00Z', end: '2026-10-14T10:00:00Z' });
    expect((await kalenderSchreiben(kalId)).fehler).toEqual([]);
    const o = (await objekte()).find((x) => x.data.includes('UID:apple-2@icloud'))!;
    expect(o.data).toContain('SUMMARY:Lehrplanung WS');
    expect(o.data).toContain('DTSTART:20261014T090000Z');
    expect(o.data).toContain('BEGIN:VALARM');
  });

  it('changed elsewhere meanwhile: Kollege does not overwrite, the server wins, the event says so', async () => {
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, 'apple-2@icloud')));
    await runAction(andreas(), 'event.update', { id: e!.id, title: 'Kollege-Fassung' });
    const o = (await dav.fetchCalendarObjects({ calendar: arbeit })).find((x) => String(x.data).includes('apple-2@icloud'))!;
    await dav.updateCalendarObject({ calendarObject: { ...o, data: String(o.data).replace(/SUMMARY:[^\r\n]*/, 'SUMMARY:Apple-Fassung') } });
    const r = await kalenderSchreiben(kalId);
    expect(r.fehler.join()).toMatch(/412/);
    expect((await objekte()).find((x) => x.data.includes('UID:apple-2@icloud'))!.data).toContain('SUMMARY:Apple-Fassung');
    expect(await meta(e!.id)).toHaveProperty('konflikt');
    await syncConnection(kalId, { now: NOW });
    const [nachher] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, e!.id)));
    expect(nachher!.title).toBe('Apple-Fassung');
  });

  it('with an external attendee it stays a draft (E10) – nothing goes into the calendar by itself', async () => {
    const { result } = await termin({ title: 'Jury-Gespräch', teilnahme: [{ email: 'a.weber@ihk-schwaben.example', name: 'Anna Weber' }] });
    expect(await meta(result.id)).toMatchObject({ versand: 'entwurf', teilnahme: [{ email: 'a.weber@ihk-schwaben.example', status: 'nicht_eingeladen' }] });
    await kalenderSchreiben(kalId);
    expect((await objekte()).some((x) => x.data.includes('Jury-Gespräch'))).toBe(false);
  });

  it('the model can never send an invitation or a cancellation that goes out (hard rule)', async () => {
    const { result } = await termin({ title: 'Nur für Menschen', teilnahme: [{ email: 'a.weber@ihk-schwaben.example' }] });
    await expectRejects(runAction(model(), 'event.send', { id: result.id }), /actor model may not run external action event.send/);
    // a draft that was never sent the model may discard
    await runAction(model(), 'event.cancel', { id: result.id });
    expect(await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, result.id)))).toHaveLength(0);
  });

  it('a discarded draft comes back with undo – also in the calendar view', async () => {
    const { result } = await termin({ title: 'Verworfen und zurück', teilnahme: [{ email: 'lisa@solaro.example' }] });
    const { actionId } = await runAction(andreas(), 'event.cancel', { id: result.id });
    expect(await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, result.id)))).toHaveLength(0);
    await undoAction(actionId, fx.users.andreas!);
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, result.id)));
    expect(e).toBeDefined();
    const m = e!.meta as { start: string; end: string };
    const sicht = await termine(fx.users.andreas!, new Date(new Date(m.start).getTime() - 86_400_000), new Date(new Date(m.end).getTime() + 86_400_000));
    expect(sicht.map((t) => t.title)).toContain('Verworfen und zurück');
  });

  it('"Einladung senden": into the calendar with attendees, invitation mail with METHOD:REQUEST, no undo afterwards', async () => {
    const { result } = await termin({ title: 'Pitch-Probe', teilnahme: [{ email: 'a.weber@ihk-schwaben.example', name: 'Anna Weber' }] });
    const vorher = smtp.empfangen.length;
    const { actionId } = await runAction(andreas(), 'event.send', { id: result.id });
    expect(await sendeTermin(actionId)).toMatchObject({ ergebnis: 'gesendet' });
    const o = (await objekte()).find((x) => x.data.includes('SUMMARY:Pitch-Probe'))!;
    expect(o.data).toMatch(/ATTENDEE;[^\r\n]*PARTSTAT=NEEDS-ACTION[^\r\n]*mailto:a\.weber@ihk-schwaben\.example/);
    expect(o.data).toContain('SCHEDULE-AGENT=CLIENT');
    const mail = smtp.empfangen.slice(vorher);
    expect(mail).toHaveLength(1);
    expect(mail[0]!.to).toEqual(['a.weber@ihk-schwaben.example']);
    expect(mail[0]!.raw).toMatch(/text\/calendar;[^\r\n]*method=REQUEST/i);
    expect(await meta(result.id)).toMatchObject({ versand: 'gesendet', teilnahme: [{ status: 'offen' }] });
    await expectRejects(undoAction(actionId, fx.users.andreas!), /cannot be undone/);
    const [a] = await withSystem((tx) => tx.select().from(actions).where(eq(actions.id, actionId)));
    expect(a!.inverse).toBeNull();

    // a change now waits for "Änderung senden" (E48) and is not written by itself
    await runAction(andreas(), 'event.update', { id: result.id, start: '2026-10-12T10:00:00Z', end: '2026-10-12T11:00:00Z' });
    expect(await meta(result.id)).toMatchObject({ versand: 'aenderung_offen' });
    await kalenderSchreiben(kalId);
    expect((await objekte()).find((x) => x.data.includes('SUMMARY:Pitch-Probe'))!.data).toContain('DTSTART:20261012T080000Z');
    const { actionId: aenderung } = await runAction(andreas(), 'event.send', { id: result.id });
    expect(await sendeTermin(aenderung)).toMatchObject({ ergebnis: 'gesendet' });
    expect((await objekte()).find((x) => x.data.includes('SUMMARY:Pitch-Probe'))!.data).toContain('DTSTART:20261012T100000Z');
    expect(smtp.empfangen.at(-1)!.raw).toContain('Subject: =?UTF-8?Q?Ge=C3=A4ndert');

    // cancellation with invited people: a person's click, CANCEL to them, gone from the calendar
    await expectRejects(runAction(model(), 'event.cancel', { id: result.id }), /actor model may not run external action event.cancel/);
    const { actionId: absage } = await runAction(andreas(), 'event.cancel', { id: result.id });
    expect(await sendeTermin(absage)).toMatchObject({ ergebnis: 'gesendet' });
    expect(smtp.empfangen.at(-1)!.raw).toMatch(/method=CANCEL/i);
    expect((await objekte()).some((x) => x.data.includes('SUMMARY:Pitch-Probe'))).toBe(false);
    expect(await meta(result.id)).toMatchObject({ status: 'CANCELLED' });
  });

  it('recalled within the 10 seconds: no mail, nothing in the calendar, the draft is back', async () => {
    const { result } = await termin({ title: 'Doch nicht', teilnahme: [{ email: 'a.weber@ihk-schwaben.example' }] });
    const vorher = smtp.empfangen.length;
    const { actionId } = await runAction(andreas(), 'event.send', { id: result.id });
    await undoAction(actionId, fx.users.andreas!);
    expect(await sendeTermin(actionId)).toMatchObject({ ergebnis: 'zurueckgeholt' });
    expect(smtp.empfangen).toHaveLength(vorher);
    expect((await objekte()).some((x) => x.data.includes('Doch nicht'))).toBe(false);
    expect(await meta(result.id)).toMatchObject({ versand: 'entwurf' });
  });

  it('undo of a written event takes it out of the calendar again', async () => {
    const { actionId } = await termin({ title: 'Versehentlich' });
    await kalenderSchreiben(kalId);
    expect((await objekte()).some((x) => x.data.includes('Versehentlich'))).toBe(true);
    await undoAction(actionId, fx.users.andreas!);
    await kalenderSchreiben(kalId);
    expect((await objekte()).some((x) => x.data.includes('Versehentlich'))).toBe(false);
  });
});
