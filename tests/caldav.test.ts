// Stage 6 (§13) against a real CalDAV server (Radicale, tests/radicale.ts), fast model mocked:
// an event with attendees is assigned to contact and matter; changes and deletions at the source
// arrive; private calendars can stay out.
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { createDAVClient } from 'tsdav';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { kalenderVerbinden } from '@/lib/connectors/kalender-einrichten';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, entries, eventCopies, links, matters, people } from '@/lib/db/schema';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { importFixtures, NOW } from './helpers';
import { RADICALE, startRadicale, type Testkalender } from './radicale';

process.env.APP_SECRET ??= 'test-app-secret-0123456789abcdef0123';
if (!RADICALE) console.warn('CalDAV-Tests übersprungen: radicale fehlt (apt install radicale)');

const ics = (o: { uid: string; summary: string; start: string; end: string; attendees?: [string, string, string][]; rrule?: string }) => [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//', 'BEGIN:VEVENT', `UID:${o.uid}`, 'DTSTAMP:20260930T080000Z',
  `DTSTART:${o.start}`, `DTEND:${o.end}`, `SUMMARY:${o.summary}`,
  ...(o.attendees?.length ? ['ORGANIZER;CN=Andreas:mailto:andreas@gruendung.uni-augsburg.example', ...o.attendees.map(([n, m, p]) => `ATTENDEE;CN=${n};PARTSTAT=${p}:mailto:${m}`)] : []),
  ...(o.rrule ? [`RRULE:${o.rrule}`] : []),
  'END:VEVENT', 'END:VCALENDAR', '',
].join('\r\n');

/** fast stand-in: picks the EXIST topic from the candidates if it is offered */
const fast = () => new MockLanguageModelV4({
  doGenerate: async (opts) => {
    const prompt = JSON.stringify(opts.prompt);
    const exist = /([0-9a-f-]{36}): „EXIST-Antrag“/.exec(prompt.replace(/\\"/g, '"'))?.[1];
    const answer = { relevant: true, confidence: 'high', summary: 'Termin.', matter: exist ? { id: exist } : null, people: [], tasks: [] };
    return {
      content: [{ type: 'text', text: JSON.stringify(answer) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
      warnings: [],
    };
  },
});

describe.skipIf(!RADICALE)('Stufe 6: Kalender über CalDAV', () => {
  let srv: Testkalender;
  let dav: Awaited<ReturnType<typeof createDAVClient>>;
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  let connId: string;
  let arbeitUrl: string;
  const byUid = async (uid: string) => (await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, uid))))[0];

  beforeAll(async () => {
    fx = await importFixtures();
    srv = await startRadicale();
    dav = await createDAVClient({ serverUrl: srv.url, credentials: { username: srv.user, password: srv.password }, authMethod: 'Basic', defaultAccountType: 'caldav' });
    arbeitUrl = `${srv.url}${srv.user}/arbeit/`;
    await dav.makeCalendar({ url: arbeitUrl, props: { displayname: 'Arbeit' } });
    await dav.makeCalendar({ url: `${srv.url}${srv.user}/privat/`, props: { displayname: 'Privat' } });
    const cals = await dav.fetchCalendars();
    const arbeit = cals.find((c) => c.displayName === 'Arbeit')!;
    const privat = cals.find((c) => c.displayName === 'Privat')!;
    const put = (cal: typeof arbeit, name: string, body: string) => dav.createCalendarObject({ calendar: cal, filename: `${name}.ics`, iCalString: body });
    await put(arbeit, 'solaro', ics({ uid: 'solaro-beratung-2@test', summary: 'Zweite Beratung Solaro', start: '20261008T080000Z', end: '20261008T090000Z',
      attendees: [['Lisa Meier', 'lisa@solaro.example', 'ACCEPTED'], ['Tom Kraus', 'tom@solaro.example', 'NEEDS-ACTION']] }));
    await put(arbeit, 'jourfixe', ics({ uid: 'jourfixe@test', summary: 'Jour fixe', start: '20261005T070000Z', end: '20261005T073000Z', rrule: 'FREQ=WEEKLY;COUNT=10' }));
    await put(privat, 'zahnarzt', ics({ uid: 'zahnarzt@test', summary: 'Zahnarzt', start: '20261009T150000Z', end: '20261009T160000Z' }));

    ({ id: connId } = await kalenderVerbinden({ url: srv.url, user: srv.user, password: srv.password, ownerEmail: 'andreas@gruendung.uni-augsburg.example', kalender: ['Arbeit'], importSince: '2026-01-01' }));
    await runImport([connId], { model: fast(), now: NOW, importId: 'caldav-test' });
  }, 120_000);

  afterAll(async () => {
    await srv?.stop();
    await closeDb();
  });

  it('acceptance: an event with attendees is assigned to contact and matter', async () => {
    const e = (await byUid('solaro-beratung-2@test'))!;
    const [lisa] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Lisa Meier')));
    const [exist] = await withSystem((tx) => tx.select().from(matters).where(eq(matters.title, 'EXIST-Antrag')));
    const l = await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, e.id)));
    expect(l).toEqual(expect.arrayContaining([
      expect.objectContaining({ target_type: 'person', target_id: lisa!.id, origin: 'rule' }),
      expect.objectContaining({ target_type: 'org', origin: 'rule' }),
      expect.objectContaining({ target_type: 'matter', target_id: exist!.id }),
    ]));
  });

  it('keeps attendance per person (E48) and the place of the copy', async () => {
    const e = (await byUid('solaro-beratung-2@test'))!;
    expect((e.meta as { teilnahme: unknown }).teilnahme).toEqual([
      { email: 'lisa@solaro.example', name: 'Lisa Meier', status: 'zugesagt' },
      { email: 'tom@solaro.example', name: 'Tom Kraus', status: 'offen' },
    ]);
    const [copy] = await withSystem((tx) => tx.select().from(eventCopies).where(eq(eventCopies.entry_id, e.id)));
    expect(copy).toMatchObject({ connection_id: connId, calendar_url: arbeitUrl, pending: false });
    expect(copy!.etag).toBeTruthy();
    expect(e).toMatchObject({ visibility: 'restricted', visible_to: [fx.users.andreas] });
  });

  it('reads only the chosen calendars – the private one stays out', async () => {
    expect(await byUid('zahnarzt@test')).toBeUndefined();
    expect((await byUid('jourfixe@test'))!.meta).toMatchObject({ recurrence: 'FREQ=WEEKLY;COUNT=10' });
  });

  it('a change at the source arrives; an unchanged calendar is not read again', async () => {
    const quiet = await syncConnection(connId, { now: NOW });
    expect(quiet.newEntryIds.length + quiet.knownEntryIds.length).toBe(0);
    const [o] = (await dav.fetchCalendarObjects({ calendar: (await dav.fetchCalendars()).find((c) => c.displayName === 'Arbeit')! })).filter((x) => x.url.endsWith('solaro.ics'));
    await dav.updateCalendarObject({ calendarObject: { ...o!, data: ics({ uid: 'solaro-beratung-2@test', summary: 'Zweite Beratung Solaro (verschoben)', start: '20261009T080000Z', end: '20261009T090000Z',
      attendees: [['Lisa Meier', 'lisa@solaro.example', 'ACCEPTED'], ['Tom Kraus', 'tom@solaro.example', 'ACCEPTED']] }) } });
    const r = await syncConnection(connId, { now: NOW });
    expect(r.knownEntryIds).toHaveLength(1);
    const e = (await byUid('solaro-beratung-2@test'))!;
    expect(e).toMatchObject({ title: 'Zweite Beratung Solaro (verschoben)' });
    expect(e.occurred_at.toISOString()).toBe('2026-10-09T08:00:00.000Z');
    expect((e.meta as { teilnahme: { status: string }[] }).teilnahme.map((t) => t.status)).toEqual(['zugesagt', 'zugesagt']);
    // the assignment stays
    expect(await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, e.id)))).not.toHaveLength(0);
  });

  it('deleted at the source: the event counts as cancelled', async () => {
    const [o] = (await dav.fetchCalendarObjects({ calendar: (await dav.fetchCalendars()).find((c) => c.displayName === 'Arbeit')! })).filter((x) => x.url.endsWith('jourfixe.ics'));
    await dav.deleteCalendarObject({ calendarObject: o! });
    await syncConnection(connId, { now: NOW });
    const e = (await byUid('jourfixe@test'))!;
    expect(e.meta).toMatchObject({ status: 'CANCELLED', an_quelle_geloescht: true });
    expect(await withSystem((tx) => tx.select().from(eventCopies).where(eq(eventCopies.entry_id, e.id)))).toHaveLength(0);
  });

  it('the password is stored only encrypted', async () => {
    const [c] = await withSystem((tx) => tx.select().from(connections).where(and(eq(connections.id, connId), sql`true`)));
    expect(JSON.stringify(c!.config)).not.toContain(srv.password);
  });
});
