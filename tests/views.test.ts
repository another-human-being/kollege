// Views (§8) on the imported fixtures, "today" = 01.10.2026 08:00.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { closeDb, withSystem } from '@/lib/db/client';
import { entries } from '@/lib/db/schema';
import { areaList, matterDetail } from '@/lib/views/areas';
import { contactList, orgDetail, personDetail } from '@/lib/views/contacts';
import { settings } from '@/lib/views/settings';
import { taskList } from '@/lib/views/tasks';
import { today, todayPage } from '@/lib/views/today';
import { matters, orgs, people } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { importFixtures, NOW } from './helpers';

let fx: Awaited<ReturnType<typeof importFixtures>>;
beforeAll(async () => {
  fx = await importFixtures();
});
afterAll(() => closeDb());

const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe('Heute', () => {
  it('Andreas, mine: his questions, overdue tasks, unanswered mail, commitments, today’s event', async () => {
    const t = await today(fx.users.andreas!, 'mine', NOW);
    expect(t.hints.map((h) => h.kind).sort()).toEqual(['clarify', 'clarify', 'review_batch']);
    expect(t.hints.find((h) => h.kind === 'review_batch')).toMatchObject({ title: '20 ungeprüft – prüfen' });
    expect(t.due.map((d) => [d.title, d.reason, d.area])).toEqual([
      ['Raum mit Beamer für Sitzung 3 buchen (40 Personen)', 'überfällig', 'Lehrveranstaltung'],
      ['Feedback zum Finanzplan an Tom Kraus', 'überfällig', 'Gründungsteam'],
    ]);
    // m13, m05, m06, m09 – not m03 (answered by m04), not m12/m14 (skipped)
    expect(titles(t.waitingOnUs)).toEqual([
      'Kooperation Stadtwerke × StartHub', 'Finanzplan v2', 'Kurze Frage zum Termin', 'Entrepreneurship Basics – Raum für Sitzung 3',
    ]);
    expect(t.waitingOnUs[1]!.reason).toBe('Tom Kraus wartet auf Antwort');
    expect(titles(t.weWaitFor)).toEqual(['Folien für Sitzung 3 schicken']);
    expect(t.events).toMatchObject([{ title: 'Erstberatung Greenbyte', area: 'Gründungsteam', reason: 'Raum 2.14' }]);
  });

  it('Julia, mine: her waiting mails and the commitments of her event', async () => {
    const t = await today(fx.users.julia!, 'mine', NOW);
    expect(t.hints.map((h) => h.kind)).toEqual(['review_batch']); // Andreas' questions are his
    expect(t.due).toEqual([]);
    // m15 (Sara, open question before the meeting – expected.json) and m09 (in her mailbox too)
    expect(titles(t.waitingOnUs).sort()).toEqual(['Entrepreneurship Basics – Raum für Sitzung 3', 'Vor unserem Termin am Mittwoch']);
    expect(t.weWaitFor.map((w) => [w.title, w.overdue])).toEqual([
      ['Rückmeldung zur Jury-Anfrage', true],
      ['Zusage zum Pitch-Abend', false],
    ]);
  });

  it('team scope shows all commitments, but never more than the user may read', async () => {
    const t = await today(fx.users.mehmet!, 'team', NOW);
    expect(t.weWaitFor).toHaveLength(5);
    expect(t.due.map((d) => d.title).sort()).toEqual(['Feedback zum Finanzplan an Tom Kraus', 'Raum mit Beamer für Sitzung 3 buchen (40 Personen)']);
    // Mehmet has none of these mails in his mailbox; the StartHub mail m10 is only 1 working day old
    expect(t.waitingOnUs).toEqual([]);
    expect(t.hints.map((h) => h.kind)).toEqual(['review_batch']);
  });

  it('a reply from another mailbox ends "wartet auf uns" also for those who cannot read it', async () => {
    // test setup: the reply arrives through the intake as a raw entry
    const [m09] = await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' = 'm09'`));
    await withSystem((tx) =>
      tx.insert(entries).values({
        kind: 'mail', dedupe_key: '<reply-m09@test>', thread_key: m09!.thread_key, occurred_at: new Date('2026-09-29T09:00:00+02:00'),
        author_user_id: fx.users.andreas, title: 'Re: Raum', body_text: 'Ist gebucht.', visibility: 'restricted',
        visible_to: [fx.users.andreas!], processing_state: 'done', meta: { from: { email: 'andreas@gruendung.uni-augsburg.example' } },
      }),
    );
    const t = await today(fx.users.julia!, 'mine', NOW);
    expect(titles(t.waitingOnUs)).toEqual(['Vor unserem Termin am Mittwoch']);
  });
});

const matterId = async (title: string) => (await withSystem((tx) => tx.select().from(matters).where(eq(matters.title, title))))[0]!.id;

describe('Bereiche', () => {
  it('events: columns from the area, computed waiting and stale, unreviewed count', async () => {
    const { area, rows, unreviewedCount } = await areaList(fx.users.julia!, 'events', {}, NOW);
    expect(area.fields.map((f) => f.label)).toEqual(['Datum', 'Ort', 'Plätze', 'Anmeldungen']);
    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));
    expect(Object.keys(byTitle).sort()).toEqual(['Gründungsnacht 2025', 'Gründungsnacht 2026', 'Pitch-Abend 19.11.']);
    // Pitch-Abend: nothing on our side, two commitments of others → wartet
    expect(byTitle['Pitch-Abend 19.11.']).toMatchObject({ waiting: true, stale: false, owner: 'Julia', unreviewed: true });
    // last entry 28.11.2025 → hängt
    expect(byTitle['Gründungsnacht 2025']).toMatchObject({ stale: true });
    expect(byTitle['Gründungsnacht 2026']).toMatchObject({ stale: false, waiting: false });
    expect(unreviewedCount).toBe(3);
  });

  it('filters by owner, phase, status and unreviewed', async () => {
    expect((await areaList(fx.users.andreas!, 'teaching', { owner: fx.users.andreas }, NOW)).rows.map((r) => r.title)).toEqual([
      'Entrepreneurship Basics WS 26/27',
    ]);
    expect((await areaList(fx.users.andreas!, 'events', { owner: 'none' }, NOW)).rows).toEqual([]);
    expect((await areaList(fx.users.andreas!, 'events', { status: 'done' }, NOW)).rows).toEqual([]);
    expect((await areaList(fx.users.andreas!, 'events', { phase: 'Planung' }, NOW)).rows).toEqual([]);
    expect((await areaList(fx.users.andreas!, 'social', { unreviewed: true }, NOW)).rows.map((r) => r.title)).toEqual(['Redaktionsplan Q4']);
  });

  it('founding teams list the teams (orgs), not their topics', async () => {
    const { rows } = await areaList(fx.users.mehmet!, 'founding_teams', {}, NOW);
    expect(rows.map((r) => [r.type, r.title]).sort()).toEqual([['org', 'Greenbyte'], ['org', 'Kitchen Loop'], ['org', 'Solaro']]);
  });
});

describe('Detail', () => {
  it('Andreas sees Julia’s event: placeholders instead of her mails, her commitments with their source', async () => {
    const d = (await matterDetail(fx.users.andreas!, await matterId('Pitch-Abend 19.11.'), NOW))!;
    expect(d.timeline).toEqual([
      { type: 'stub', kind: 'mail', at: '2026-09-21T08:12:00.000Z', owners: ['Julia'] },
      { type: 'stub', kind: 'mail', at: '2026-09-21T08:30:00.000Z', owners: ['Julia'] },
    ]);
    expect(d.commitments.ours).toEqual([]);
    expect(d.commitments.theirs.map((c) => [c.title, c.owner, c.overdue, c.source?.readable, c.source?.owners])).toEqual([
      ['Rückmeldung zur Jury-Anfrage', 'Anna Weber', true, false, ['Julia']],
      ['Zusage zum Pitch-Abend', 'Lisa Meier', false, false, ['Julia']],
    ]);
    expect(d.waiting).toBe(true);
    expect(d.references.map((r) => r.title).sort()).toEqual(['Anna Weber', 'Lisa Meier']);
    expect(d.systemSteps).toBeGreaterThan(0);
  });

  it('Julia sees the same event with her own (private) mails', async () => {
    const d = (await matterDetail(fx.users.julia!, await matterId('Pitch-Abend 19.11.'), NOW))!;
    expect(d.timeline.map((t) => (t.type === 'entry' ? [t.title, t.private] : t.type))).toEqual([
      ['Anfrage Jury Pitch-Abend am 19.11.', true],
      ['Einladung zum Pitch am 19.11.', true],
    ]);
  });

  it('EXIST-Antrag: next step, both sides of commitments, files incl. attachments of readable mails', async () => {
    const id = await matterId('EXIST-Antrag');
    const a = (await matterDetail(fx.users.andreas!, id, NOW))!;
    expect(a.nextStep).toMatchObject({ title: 'Feedback zum Finanzplan an Tom Kraus' });
    expect(a.commitments.ours.map((c) => c.title)).toEqual(['Feedback zum Finanzplan an Tom Kraus', 'Kontakt zur IHK für Jury/Mentoring prüfen']);
    expect(a.commitments.theirs.map((c) => [c.title, c.owner])).toEqual([
      ['Pitchdeck schicken', 'Solaro'], ['Finanzplan überarbeiten', 'Tom Kraus'],
    ]);
    expect(a.files.map((f) => f.title).sort()).toEqual([
      'Beratungsprotokoll_22-09.docx', 'Businessplan_Entwurf.pdf', 'EXIST-Merkblatt.pdf', 'Finanzplan_Solaro_v2.xlsx',
    ]);
    expect(a.estimated).toEqual([]);
    const j = (await matterDetail(fx.users.julia!, id, NOW))!;
    // attachments of Andreas' mails are his
    expect(j.files.map((f) => f.title).sort()).toEqual(['Beratungsprotokoll_22-09.docx', 'Businessplan_Entwurf.pdf']);
    // m03, m04, m05 and e1 (Andreas' calendar, Julia not invited)
    expect(j.timeline.filter((t) => t.type === 'stub').map((t) => t.kind).sort()).toEqual(['event', 'mail', 'mail', 'mail']);
    const kinds = j.timeline.map((t) => t.at);
    expect([...kinds].sort()).toEqual(kinds); // strictly chronological
  });
});

describe('Kontakte, Aufgaben, Einstellungen', () => {
  it('lists people and organisations with their unreviewed count', async () => {
    const { rows, unreviewedCount } = await contactList(fx.users.mehmet!);
    expect(rows).toHaveLength(7 + 5);
    expect(unreviewedCount).toBe(12);
    expect(rows.find((r) => r.name === 'Lisa Meier')).toMatchObject({ type: 'person', detail: 'Solaro', emails: ['lisa@solaro.example'] });
  });

  it('Beratungsakte Solaro: people, topics, commitments of both sides', async () => {
    const [solaro] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Solaro')));
    const d = (await orgDetail(fx.users.mehmet!, solaro!.id, NOW))!;
    expect(d.people.map((p) => p.name)).toEqual(['Lisa Meier', 'Tom Kraus']);
    expect(d.matters.map((m) => m.title)).toEqual(['EXIST-Antrag']);
    expect(d.commitments.theirs.map((c) => c.title).sort()).toEqual(['Finanzplan überarbeiten', 'Pitchdeck schicken', 'Zusage zum Pitch-Abend']);
    expect(d.domains).toEqual(['solaro.example']);
  });

  it('person: addresses, matters, what they owe us', async () => {
    const [lisa] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Lisa Meier')));
    const d = (await personDetail(fx.users.andreas!, lisa!.id, NOW))!;
    expect(d.emails.map((e) => e.email)).toEqual(['lisa@solaro.example']);
    expect(d.matters.map((m) => m.title)).toEqual(['EXIST-Antrag', 'Pitch-Abend 19.11.']);
    expect(d.owes.map((t) => t.title)).toEqual(['Zusage zum Pitch-Abend']);
  });

  it('tasks: mine and the team’s, both directions', async () => {
    const mine = await taskList(fx.users.andreas!, { scope: 'mine', direction: 'ours' }, NOW);
    expect(mine.map((t) => [t.title, t.overdue])).toEqual([
      ['Raum mit Beamer für Sitzung 3 buchen (40 Personen)', true],
      ['Feedback zum Finanzplan an Tom Kraus', true],
      ['Kontakt zur IHK für Jury/Mentoring prüfen', false],
    ]);
    expect(await taskList(fx.users.andreas!, { direction: 'theirs' }, NOW)).toHaveLength(5);
    expect(await taskList(fx.users.andreas!, { status: 'done' }, NOW)).toEqual([]);
  });

  it('settings: areas in order, own and team sources only', async () => {
    const s = await settings(fx.users.andreas!);
    expect(s.areas.map((a) => a.key)).toEqual(['founding_teams', 'events', 'teaching', 'social']);
    expect(s.sources.map((c) => c.label).sort()).toEqual([
      'Kalender Andreas', 'Netzlaufwerk', 'Postfach andreas@gruendung.uni-augsburg.example', 'Postfach starthub@gruendung.uni-augsburg.example',
    ]);
    expect(s.instructions).toEqual([]);
  });
});

describe('Heute nach E39', () => {
  it('Andreas: own sections, the team part only with unowned and stuck items', async () => {
    const p = await todayPage(fx.users.andreas!, NOW);
    expect(p.clarify).toHaveLength(2);
    expect(p.today.map((i) => i.title)).toEqual([
      'Raum mit Beamer für Sitzung 3 buchen (40 Personen)', 'Feedback zum Finanzplan an Tom Kraus', 'Erstberatung Greenbyte',
    ]);
    expect(p.review.map((h) => h.title)).toEqual(['20 ungeprüft – prüfen']);
    // 3 teams + 3 topics, 3 events, 1 course, 1 post; contacts: 7 people + IHK + Uni
    expect(p.reviewCounts.map((c) => [c.label, c.n])).toEqual([
      ['Gründungsteams', 6], ['Events', 3], ['Lehre', 1], ['Social Media', 1], ['Kontakte', 9],
    ]);
    // StartHub mailbox: nobody responsible
    expect(p.team.unowned.map((m) => m.title).sort()).toEqual(['EXIST-Antrag', 'Erstberatung']);
    // Julia's Gründungsnacht 2025: last entry 28.11.2025
    expect(p.team.stuckAtOthers.map((m) => [m.title, m.owner])).toEqual([['Gründungsnacht 2025', 'Julia']]);
  });

  it('Julia: her stale event under "Hängt"; the area filter narrows every section', async () => {
    const p = await todayPage(fx.users.julia!, NOW);
    expect(p.stale.map((m) => m.title)).toEqual(['Gründungsnacht 2025']);
    expect(p.stale[0]!.reason).toMatch(/^seit \d+ Tagen nichts passiert$/);
    const ev = await todayPage(fx.users.julia!, NOW, 'events');
    expect(ev.waitingOnUs).toEqual([]); // m15 (founding teams) and m09 (teaching) are filtered out
    expect(ev.weWaitFor.map((w) => w.title)).toEqual(['Rückmeldung zur Jury-Anfrage', 'Zusage zum Pitch-Abend']);
    expect(ev.team.unowned).toEqual([]);
  });
});
