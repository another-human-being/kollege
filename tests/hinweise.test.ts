// Acceptance stage 8 (§13): hints appear once (dedupe), with a reason, and close themselves.
// Plus the moments (after_event, outcome, handover), "Später", instructions about hints and
// advice from earlier cases with its guards (decisions 40–42).
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { answerHint, answerHintText, runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { entries, hints, links, matters, tasks } from '@/lib/db/schema';
import { pruefen, ratAnwenden, titelWoerter } from '@/lib/hinweise/rat';
import { regelnAnwenden } from '@/lib/hinweise/regeln';
import { matterDetail } from '@/lib/views/areas';
import { settings } from '@/lib/views/settings';
import { vergangeneSchliessen } from '@/lib/hinweise/abschluss';
import { todayPage } from '@/lib/views/today';
import { createEntry, expectRejects, importFixtures, NOW } from './helpers';

const user = (id: string) => ({ type: 'user' as const, userId: id });
const tage = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const hint = async (where: ReturnType<typeof sql>) => (await withSystem((tx) => tx.select().from(hints).where(where)));
const matterId = async (title: string) => (await withSystem((tx) => tx.select().from(matters).where(eq(matters.title, title))))[0]!.id;

/** think stand-in for advice: answers with what the prompt contains */
const think = (antwort: (prompt: string) => object) => new MockLanguageModelV4({
  doGenerate: async (opts) => ({
    content: [{ type: 'text', text: JSON.stringify(antwort(JSON.stringify(opts.prompt))) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 20, text: 20, reasoning: undefined } },
    warnings: [],
  }),
});

describe('Stufe 8: Hinweise & Rat', () => {
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  let andreas: string;
  let julia: string;

  beforeAll(async () => {
    fx = await importFixtures();
    andreas = fx.users.andreas!;
    julia = fx.users.julia!;
  }, 60_000);
  afterAll(() => closeDb());

  describe('Regeln', () => {
    it('appear once, each with a reason (acceptance)', async () => {
      const erst = await regelnAnwenden(NOW);
      expect(erst.neu).toBeGreaterThan(5);
      expect((await regelnAnwenden(NOW)).neu).toBe(0);
      const alle = await hint(sql`${hints.kind} IN ('overdue', 'waiting', 'stale', 'handover', 'after_event', 'outcome')`);
      expect(alle.length).toBe(erst.neu);
      for (const h of alle) expect(h.reason?.length).toBeGreaterThan(3);
      expect(alle.map((h) => h.text)).toEqual(expect.arrayContaining([
        '„Feedback zum Finanzplan an Tom Kraus“ ist überfällig.', 'Tom Kraus wartet auf Antwort.', 'Solaro hat „Pitchdeck schicken“ noch nicht geliefert.',
      ]));
    });

    it('close themselves when the cause is gone (acceptance)', async () => {
      const [t] = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Feedback zum Finanzplan an Tom Kraus')));
      const [h] = await hint(sql`${hints.kind} = 'overdue' AND ${hints.target_id} = ${t!.id}`);
      expect((await todayPage(andreas, NOW)).today.find((i) => i.id === t!.id)?.hintId).toBe(h!.id);
      await runAction(user(andreas), 'task.complete', { id: t!.id });
      expect((await regelnAnwenden(NOW)).erledigt).toBeGreaterThanOrEqual(1);
      expect((await hint(sql`${hints.id} = ${h!.id}`))[0]!.status).toBe('done');
    });

    it('a moved due date is a new cause', async () => {
      const [t] = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Raum mit Beamer für Sitzung 3 buchen (40 Personen)')));
      await runAction(user(andreas), 'task.update', { id: t!.id, due_date: '2026-09-30' });
      const r = await regelnAnwenden(NOW);
      expect(r).toEqual({ neu: 1, erledigt: 1 });
      expect((await hint(sql`${hints.kind} = 'overdue' AND ${hints.target_id} = ${t!.id} AND ${hints.status} = 'open'`))[0]!.reason).toBe('fällig am 30.09.');
    });

    it('"Später" hides the item until tomorrow; done by hand it does not come back', async () => {
      const wartet = (now: Date) => todayPage(andreas, now).then((p) => p.waitingOnUs.map((i) => i.title));
      const [h] = await hint(sql`${hints.text} = 'Tom Kraus wartet auf Antwort.'`);
      expect(await wartet(NOW)).toContain('Finanzplan v2');
      await runAction(user(andreas), 'hint.snooze', { hint_id: h!.id, bis: tage(1).toISOString() });
      expect(await wartet(NOW)).not.toContain('Finanzplan v2');
      expect(await wartet(tage(1))).toContain('Finanzplan v2');
      await runAction(user(andreas), 'hint.resolve', { hint_id: h!.id });
      expect(await wartet(tage(1))).not.toContain('Finanzplan v2');
      await regelnAnwenden(tage(1));
      expect(await hint(sql`${hints.text} = 'Tom Kraus wartet auf Antwort.'`)).toHaveLength(1);
    });

    it('someone else’s hint stays theirs (RLS)', async () => {
      const [h] = await hint(sql`${hints.text} = 'Tom Kraus wartet auf Antwort.'`);
      await expectRejects(runAction(user(julia), 'hint.snooze', { hint_id: h!.id }), /not found|no row/i);
    });
  });

  describe('Momente', () => {
    it('handover: the recipient gets the state of things; accepted it closes', async () => {
      const id = await matterId('Pitch-Abend 19.11.');
      // the newest entry of the topic is a private mail of Julia's: its subject must not reach Andreas
      const privat = await createEntry({ kind: 'mail', title: 'Vertraulich: Honorar Jury', visibility: 'restricted', visible_to: [julia], occurred_at: NOW });
      await withSystem((tx) => tx.insert(links).values({ entry_id: privat, target_type: 'matter', target_id: id, origin: 'rule', confidence: 'high' }));
      await runAction(user(julia), 'matter.handover', { id, to_user_id: andreas });
      await regelnAnwenden(NOW);
      const [h] = await hint(sql`${hints.kind} = 'handover' AND ${hints.target_id} = ${id}`);
      expect(h).toMatchObject({ user_id: andreas, text: 'Julia übergibt dir „Pitch-Abend 19.11.“.', status: 'open' });
      expect(h!.reason).toMatch(/^Nächster Schritt: .* · offene Zusagen: \d+/);
      expect(h!.reason).not.toContain('Vertraulich');
      // Heute says the same as the hint
      expect((await todayPage(andreas, NOW)).handoversToMe.find((m) => m.id === id)!.reason).toBe(h!.reason);
      await runAction(user(andreas), 'matter.handover_accept', { id });
      await regelnAnwenden(NOW);
      expect((await hint(sql`${hints.id} = ${h!.id}`))[0]!.status).toBe('done');
    });

    it('after_event: "Was kam raus?" after an event with people from outside; the answer becomes a note', async () => {
      const solaro = await matterId('EXIST-Antrag');
      const termin = (titel: string, ende: Date) => createEntry({
        kind: 'event', title: titel, author_user_id: andreas, visibility: 'restricted', visible_to: [andreas], occurred_at: new Date(ende.getTime() - 3_600_000),
        meta: { start: new Date(ende.getTime() - 3_600_000).toISOString(), end: ende.toISOString(), attendees: ['lisa@solaro.example', 'andreas@gruendung.uni-augsburg.example'] },
      });
      const gestern = await termin('Beratung Solaro II', new Date(NOW.getTime() - 2 * 3_600_000));
      const alt = await termin('Beratung Solaro I', tage(-3));
      const intern = await createEntry({ kind: 'event', title: 'Jour fixe', author_user_id: andreas, occurred_at: NOW,
        meta: { start: tage(-0.2).toISOString(), end: tage(-0.1).toISOString(), attendees: ['julia@gruendung.uni-augsburg.example'] } });
      for (const e of [gestern, alt, intern]) {
        await withSystem((tx) => tx.insert(links).values({ entry_id: e, target_type: 'matter', target_id: solaro, origin: 'rule', confidence: 'high' }));
      }
      await regelnAnwenden(NOW);
      // the fixtures have their own: Kitchen Loop ended yesterday, Greenbyte (the "Später" test above ran a day ahead)
      expect((await hint(sql`${hints.kind} = 'after_event'`)).map((x) => x.text).sort()).toEqual([
        'Was kam bei „Beratung Kitchen Loop“ raus?', 'Was kam bei „Beratung Solaro II“ raus?', 'Was kam bei „Erstberatung Greenbyte“ raus?']);
      const h = await hint(sql`${hints.kind} = 'after_event' AND ${hints.target_id} = ${gestern}`);
      expect(h[0]).toMatchObject({ user_id: andreas, reason: 'Termin am 01.10. mit lisa@solaro.example' });

      await answerHintText(andreas, h[0]!.id, 'Pitchdeck kommt Montag, EXIST-Antrag Ende Oktober.');
      const [n] = await withSystem((tx) => tx.select().from(entries).where(and(eq(entries.kind, 'note'), eq(entries.title, 'Nach: Beratung Solaro II'))));
      expect(n!.body_text).toContain('Pitchdeck kommt Montag');
      expect((await hint(sql`${hints.id} = ${h[0]!.id}`))[0]!.status).toBe('done');
      expect((await regelnAnwenden(NOW)).neu).toBe(0);
    });

    it('outcome: "Wie lief’s?" after done; the answer is the outcome note', async () => {
      const id = await matterId('Redaktionsplan Q4');
      await runAction(user(fx.users.mehmet!), 'matter.set_status', { id, status: 'done' });
      await regelnAnwenden(NOW);
      const [h] = await hint(sql`${hints.kind} = 'outcome' AND ${hints.target_id} = ${id}`);
      expect(h).toMatchObject({ user_id: fx.users.mehmet, text: 'Wie lief „Redaktionsplan Q4“?' });
      expect((await todayPage(fx.users.mehmet!, NOW)).momente.map((m) => m.id)).toContain(h!.id);
      await answerHintText(fx.users.mehmet!, h!.id, 'Gut, aber zu viele Beiträge im Dezember.');
      expect((await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, id))))[0]!.outcome_note).toBe('Gut, aber zu viele Beiträge im Dezember.');
      await regelnAnwenden(NOW);
      expect((await hint(sql`${hints.id} = ${h!.id}`))[0]!.status).toBe('done');
    });
  });

  describe('Vergangene Events (09.10.)', () => {
    it('close themselves the day after their date, once; "Wie lief’s?" follows', async () => {
      const vorbei = (await runAction<{ id: string }>(user(andreas), 'matter.create', { area_key: 'events', title: 'Workshop Pitch-Training', fields: { date: '2026-09-30' } })).result.id;
      const heute = (await runAction<{ id: string }>(user(andreas), 'matter.create', { area_key: 'events', title: 'Sprechstunde Oktober', fields: { date: '2026-10-01' } })).result.id;
      const ohne = (await runAction<{ id: string }>(user(andreas), 'matter.create', { area_key: 'events', title: 'Demo Day', date_start: '2026-09-25T18:00:00+02:00', date_end: '2026-09-25T22:00:00+02:00' })).result.id;
      const status = async (id: string) => (await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, id))))[0]!.status;
      await runAction(user(andreas), 'matter.assign', { id: vorbei, owner_user_id: andreas });

      expect(await vergangeneSchliessen(NOW)).toBe(2);
      expect([await status(vorbei), await status(heute), await status(ohne)]).toEqual(['done', 'open', 'done']);
      // without a date nothing is decided
      expect(await status(await matterId('Gründungsnacht 2026'))).toBe('open');
      expect(await vergangeneSchliessen(NOW)).toBe(0);

      await regelnAnwenden(NOW);
      const [h] = await hint(sql`${hints.kind} = 'outcome' AND ${hints.target_id} = ${vorbei}`);
      expect(h).toMatchObject({ text: 'Wie lief „Workshop Pitch-Training“?', user_id: andreas, status: 'open' });

      // opened again by a person: it stays open
      await runAction(user(andreas), 'matter.set_status', { id: ohne, status: 'open' });
      expect(await vergangeneSchliessen(tage(3))).toBe(1); // only "Sprechstunde Oktober", now past as well
      expect(await status(ohne)).toBe('open');
    });
  });

  describe('Anweisungen zu Hinweisen', () => {
    it('"Wartet-Hinweise nur montags" – applied without a model, on Mondays they show', async () => {
      const zahl = async (now: Date) => (await todayPage(julia, now)).weWaitFor.length + (await todayPage(julia, now)).waitingOnUs.length;
      const vorher = await zahl(NOW);
      expect(vorher).toBeGreaterThan(0);
      await runAction(user(julia), 'instruction.create', { body_text: 'Wartet-Hinweise nur montags.', scope: 'personal', hinweise: { arten: ['waiting'], wochentage: [1] } });
      expect(await zahl(NOW)).toBe(0); // Thursday
      expect(await zahl(new Date('2026-10-05T08:00:00+02:00'))).toBeGreaterThan(0); // Monday
      // the settings show how the sentence was understood
      expect((await settings(julia)).instructions.find((i) => i.text === 'Wartet-Hinweise nur montags.')!.hinweise).toBe('Wirkt auf Wartet: nur Mo');
      // a rule about hints is personal
      await expectRejects(runAction(user(julia), 'instruction.create', { body_text: 'x', scope: 'team', hinweise: { aus: true } }), /personal|ungültig|invalid/i);
    });
  });

  describe('Rat aus früheren Fällen', () => {
    it('one comparable case and no predecessor: a question, no advice', async () => {
      // the 2025 night is over – closed by a person (the import does not close topics)
      await runAction(user(julia), 'matter.set_status', { id: await matterId('Gründungsnacht 2025'), status: 'done' });
      let aufrufe = 0;
      const r = await ratAnwenden(NOW, { model: think(() => { aufrufe++; return { rat: null, belege: [] }; }) });
      expect(r.rat).toBe(0);
      expect(aufrufe).toBe(0);
      const [h] = await hint(sql`${hints.dedupe_key} LIKE 'vorgaenger:%'`);
      expect(h).toMatchObject({ kind: 'clarify', text: 'Ist „Gründungsnacht 2025“ der Vorgänger von „Gründungsnacht 2026“?', user_id: julia });
      expect((await ratAnwenden(NOW, { model: think(() => ({})) })).fragen).toBe(0);
    });

    it('with the predecessor: one advice with evidence from the retrospective (f4)', async () => {
      const [h] = await hint(sql`${hints.dedupe_key} LIKE 'vorgaenger:%'`);
      await answerHint(julia, h!.id, 0);
      const gn = await matterId('Gründungsnacht 2026');
      expect((await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, gn))))[0]!.predecessor_id).toBe(await matterId('Gründungsnacht 2025'));
      let prompt = '';
      const r = await ratAnwenden(NOW, { model: think((p) => {
        prompt = p;
        const f4 = /Datei „Rueckblick\.docx“ \[ID ([0-9a-f-]{36})\]/.exec(p)![1];
        return { rat: 'Lade diesmal früher ein – 2025 ging die Einladung 12 Tage vorher raus, belegt waren 18 von 60 Plätzen.',
          belege: [{ id: f4, zitat: 'Einladung ging 12 Tage vor dem Termin raus' }] };
      }) });
      expect(r.rat).toBe(1);
      expect(prompt).toContain('Gründungsnacht 2025');
      expect(prompt).toContain("Gründungsnacht 2025 (abgeschlossen)"); expect(prompt).toContain("Rückblick Gründungsnacht 2025");
      const [a] = await hint(sql`${hints.kind} = 'advice' AND ${hints.target_id} = ${gn}`);
      expect(a).toMatchObject({ user_id: julia, status: 'open', text: expect.stringContaining('früher ein') });
      expect(a!.reason).toBe('„Einladung ging 12 Tage vor dem Termin raus“ – Datei „Rueckblick.docx“');
      expect((await todayPage(julia, NOW)).momente.map((m) => m.id)).toContain(a!.id);
      // once
      let nochmal = 0;
      expect((await ratAnwenden(NOW, { model: think(() => { nochmal++; return { rat: null, belege: [] }; }) })).rat).toBe(0);
      expect(nochmal).toBe(0);
    });

    it('advice also on the topic’s page and in the chat tool – it stays there after "Danke, gemerkt" (09.10.)', async () => {
      const gn = await matterId('Gründungsnacht 2026');
      const d = (await matterDetail(julia, gn, NOW))!;
      expect(d.rat).toHaveLength(1);
      expect(d.rat[0]).toMatchObject({ frage: false, offen: true, optionen: ['Danke, gemerkt'], belege: ['„Einladung ging 12 Tage vor dem Termin raus“ – Datei „Rueckblick.docx“'] });
      await answerHint(julia, d.rat[0]!.id, 0);
      expect((await todayPage(julia, NOW)).momente.map((m) => m.id)).not.toContain(d.rat[0]!.id);
      expect((await matterDetail(julia, gn, NOW))!.rat[0]).toMatchObject({ offen: false, optionen: [], text: expect.stringContaining('früher ein') });
      // advice is the owner's hint: others do not see it (RLS)
      expect((await matterDetail(andreas, gn, NOW))!.rat).toEqual([]);
    });

    it('guards: a quote not in its source or a number not in the data – no advice', () => {
      const fall = { id: 'm', titel: 'Gründungsnacht 2025', text: 'Felder: {"registrations":18}', quellen: [{ id: 'q1', titel: 'Datei', text: 'Einladung ging 12 Tage vor dem Termin raus.' }] };
      const ok = { rat: 'Früher einladen als 12 Tage vorher.', belege: [{ id: 'q1', zitat: 'Einladung ging 12 Tage vor dem Termin raus' }] };
      expect(pruefen(ok, [fall], 'Gründungsnacht 2026')).not.toBeNull();
      expect(pruefen({ ...ok, belege: [{ id: 'q1', zitat: 'Einladung ging 3 Wochen vorher raus' }] }, [fall], '')).toBeNull();
      expect(pruefen({ ...ok, belege: [{ id: 'q9', zitat: 'Einladung ging 12 Tage vor dem Termin raus' }] }, [fall], '')).toBeNull();
      expect(pruefen({ ...ok, rat: 'Lade 30 Tage vorher ein.' }, [fall], 'Gründungsnacht 2026')).toBeNull();
      expect(pruefen({ rat: null, belege: [] }, [fall], '')).toBeNull();
      expect(titelWoerter('Gründungsnacht 2026 – Ablauf und Catering')).toEqual(['gründungsnacht', 'ablauf', 'catering']);
    });
  });
});
