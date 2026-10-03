// Stage 1 acceptance (BAUVORLAGE §13) on the fixtures, imported through the intake
// with the oracle instead of the fast model. Expectations come from fixtures/expected.json.
import { readFileSync } from 'node:fs';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction } from '@/lib/actions';
import { fixturesDir } from '@/lib/config';
import { closeDb, withSystem, withUser } from '@/lib/db/client';
import { actions, areas, entries, hints, links, matters, orgs, people, personEmails, tasks, users } from '@/lib/db/schema';
import { importFixtures } from './helpers';

interface Expected {
  orgs: { key: string; name: string; role: string; domains: string[] }[];
  people: { key: string; name: string; emails: string[]; org: string }[];
  matters: { key: string; area: string; title: string; org?: string; owner: string | null }[];
  items: Record<string, { model: unknown; assert: Record<string, unknown> }>;
  rls_checks: ({ as: string; expect: string } & ({ entry: string } | { task_from: string }))[];
}
const expected = JSON.parse(readFileSync(`${fixturesDir}/expected.json`, 'utf8')) as Expected;

let fx: Awaited<ReturnType<typeof importFixtures>>;
beforeAll(async () => {
  fx = await importFixtures();
});
afterAll(() => closeDb());

const uid = (key: string) => fx.users[key]!;

async function entryOf(key: string) {
  const rows = await withSystem((tx) =>
    tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' = ${key}`),
  );
  expect(rows, `entries for ${key}`).toHaveLength(1);
  return rows[0]!;
}

async function idOf(kind: 'org' | 'person' | 'matter', key: string): Promise<string> {
  return withSystem(async (tx) => {
    if (kind === 'org') {
      const o = expected.orgs.find((x) => x.key === key)!;
      return (await tx.select().from(orgs).where(eq(orgs.name, o.name)))[0]!.id;
    }
    if (kind === 'person') {
      const p = expected.people.find((x) => x.key === key)!;
      return (await tx.select().from(personEmails).where(eq(personEmails.email, p.emails[0]!)))[0]!.person_id;
    }
    const m = expected.matters.find((x) => x.key === key)!;
    const [row] = await tx
      .select({ id: matters.id })
      .from(matters)
      .innerJoin(areas, eq(areas.id, matters.area_id))
      .where(and(eq(matters.title, m.title), eq(areas.key, m.area)));
    return row!.id;
  });
}

async function linksOf(entryId: string) {
  return withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, entryId)));
}

async function canSee(userKey: string, entryId: string) {
  return withUser(uid(userKey), async (tx) => (await tx.select().from(entries).where(eq(entries.id, entryId)))[0]);
}

/** placeholders the user gets for the targets this entry is linked to */
async function stubsFor(userKey: string, entryId: string) {
  const targets = await linksOf(entryId);
  expect(targets.length, 'entry must be linked somewhere to have a placeholder').toBeGreaterThan(0);
  return withUser(uid(userKey), async (tx) => {
    const out = [];
    for (const t of targets) {
      const r = await tx.execute<Record<string, unknown>>(sql`SELECT * FROM entry_stubs(${t.target_type}, ${t.target_id})`);
      // raw queries return timestamps as text
      out.push(...r.rows.map((row) => ({ ...row, occurred_at: new Date(row.occurred_at as string) })));
    }
    return out;
  });
}

describe('intake', () => {
  it('processes every fixture item without error', async () => {
    const states = [...fx.import.results.values()];
    expect(states.filter((s) => s.state === 'error')).toEqual([]);
    expect(states).toHaveLength(15 + 7 + 6);
    const errors = await withSystem((tx) => tx.select().from(entries).where(eq(entries.kind, 'system')));
    expect(errors).toEqual([]);
  });

  it('only the system acts – never the model', async () => {
    const rows = await withSystem((tx) => tx.select({ actor: actions.actor_type }).from(actions));
    expect(new Set(rows.map((r) => r.actor))).toEqual(new Set(['system']));
  });

  it('creates exactly the expected organisations, without freemail domains', async () => {
    const rows = await withSystem((tx) => tx.select().from(orgs));
    const simplify = (o: { name: string; role: string; domains: string[] }) => ({ name: o.name, role: o.role, domains: o.domains });
    expect(rows.map(simplify).sort((a, b) => a.name.localeCompare(b.name))).toEqual(
      expected.orgs.map(simplify).sort((a, b) => a.name.localeCompare(b.name)),
    );
    expect(rows.every((o) => o.review_state === 'unreviewed')).toBe(true);
  });

  it('creates the expected people with their addresses and organisation', async () => {
    const rows = await withSystem((tx) =>
      tx.select({ name: people.name, org: orgs.name, review: people.review_state }).from(people).leftJoin(orgs, eq(orgs.id, people.org_id)),
    );
    const want = expected.people.map((p) => ({ name: p.name, org: expected.orgs.find((o) => o.key === p.org)!.name, review: 'unreviewed' }));
    expect(rows.sort((a, b) => a.name.localeCompare(b.name))).toEqual(want.sort((a, b) => a.name.localeCompare(b.name)));
    // all addresses except the freemail one, which waits for the clarify answer (m06)
    const emails = (await withSystem((tx) => tx.select().from(personEmails))).map((e) => e.email).sort();
    expect(emails).toEqual(expected.people.flatMap((p) => p.emails).filter((e) => !e.endsWith('@gmx.example')).sort());
  });

  it('creates the expected matters in their areas, founding-team topics with their org', async () => {
    const rows = await withSystem((tx) =>
      tx
        .select({ title: matters.title, area: areas.key, org: orgs.name, review: matters.review_state, by: matters.created_by_type, owner: users.name })
        .from(matters)
        .innerJoin(areas, eq(areas.id, matters.area_id))
        .leftJoin(orgs, eq(orgs.id, matters.org_id))
        .leftJoin(users, eq(users.id, matters.owner_user_id)),
    );
    // owner: whoever has the source personally; StartHub mailbox → nobody
    const want = expected.matters.map((m) => ({
      owner: m.owner ? m.owner[0]!.toUpperCase() + m.owner.slice(1) : null,
      title: m.title,
      area: m.area,
      org: m.org ? expected.orgs.find((o) => o.key === m.org)!.name : null,
      review: 'unreviewed',
      by: 'system',
    }));
    const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);
    expect(rows.sort(byTitle)).toEqual(want.sort(byTitle));
  });

  it('derives tasks and commitments of both sides with owner, due date and evidence', async () => {
    const rows = await withSystem((tx) =>
      tx
        .select({ t: tasks, reason: actions.reason, owner: people.name, org: orgs.name })
        .from(tasks)
        .innerJoin(actions, eq(actions.id, tasks.action_id))
        .leftJoin(people, eq(people.id, tasks.owner_person_id))
        .leftJoin(orgs, eq(orgs.id, tasks.org_id)),
    );
    const got = rows
      .map((r) => ({
        title: r.t.title,
        direction: r.t.direction,
        owner: r.t.owner_user_id ? Object.entries(fx.users).find(([, id]) => id === r.t.owner_user_id)![0] : r.owner,
        org: r.org,
        due: r.t.due_at?.toISOString() ?? null,
        visibility: r.t.visibility,
        quote: r.reason,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
    expect(got).toEqual(
      [
        { title: 'Feedback zum Finanzplan an Tom Kraus', direction: 'ours', owner: 'andreas', org: 'Solaro', due: '2026-09-30T21:59:59.000Z', visibility: 'team', quote: 'Könntet ihr bis Mitte der Woche drüberschauen?' },
        { title: 'Rückmeldung zur Jury-Anfrage', direction: 'theirs', owner: 'Anna Weber', org: 'IHK Schwaben', due: '2026-09-30T21:59:59.000Z', visibility: 'team', quote: 'Über eine Rückmeldung bis Ende September würde ich mich freuen.' },
        { title: 'Zusage zum Pitch-Abend', direction: 'theirs', owner: 'Lisa Meier', org: 'Solaro', due: '2026-10-10T21:59:59.000Z', visibility: 'team', quote: 'Sag mir bis 10.10. Bescheid, ob ihr dabei seid.' },
        { title: 'Raum mit Beamer für Sitzung 3 buchen (40 Personen)', direction: 'ours', owner: 'andreas', org: 'Universität Augsburg', due: '2026-09-29T21:59:59.000Z', visibility: 'team', quote: 'Könntest du das bis morgen klären?' },
        { title: 'Folien für Sitzung 3 schicken', direction: 'theirs', owner: 'Prof. Dr. Martin Hartmann', org: 'Universität Augsburg', due: '2026-10-06T21:59:59.000Z', visibility: 'team', quote: 'Meine Folien schicke ich bis 06.10.' },
        // owed by the founding team as a whole: no person, the org
        { title: 'Pitchdeck schicken', direction: 'theirs', owner: null, org: 'Solaro', due: '2026-09-29T21:59:59.000Z', visibility: 'team', quote: 'Solaro schickt Pitchdeck bis 29.09.' },
        { title: 'Finanzplan überarbeiten', direction: 'theirs', owner: 'Tom Kraus', org: 'Solaro', due: '2026-10-15T21:59:59.000Z', visibility: 'team', quote: 'Finanzplan überarbeitet bis 15.10.' },
        { title: 'Kontakt zur IHK für Jury/Mentoring prüfen', direction: 'ours', owner: 'andreas', org: 'Solaro', due: null, visibility: 'team', quote: 'StartHub prüft Kontakt zur IHK' },
      ].sort((a, b) => a.title.localeCompare(b.title)),
    );
  });

  it('ends the import with one review_batch hint for the team', async () => {
    const rows = await withSystem((tx) => tx.select().from(hints).where(eq(hints.kind, 'review_batch')));
    // 5 orgs + 7 people + 8 matters
    expect(rows).toMatchObject([{ user_id: null, text: '20 ungeprüft – prüfen', status: 'open' }]);
  });
});

// --- §13 acceptance --------------------------------------------------------

describe('acceptance stage 1', () => {
  it('RLS: Julia does not see Andreas’ mail text, but the placeholder and the commitments', async () => {
    const m05 = await entryOf('m05');
    expect(await canSee('julia', m05.id)).toBeUndefined();
    expect(await canSee('andreas', m05.id)).toMatchObject({ body_text: expect.stringContaining('Finanzplans') });

    const stubs = await stubsFor('julia', m05.id);
    expect(stubs).toContainEqual({ kind: 'mail', occurred_at: m05.occurred_at, owner_names: ['Andreas'] });
    // placeholder: no subject, no text – only these three columns
    for (const s of stubs) expect(Object.keys(s).sort()).toEqual(['kind', 'occurred_at', 'owner_names']);

    const julias = await withUser(uid('julia'), (tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, m05.id)));
    expect(julias.map((t) => t.title)).toEqual(['Feedback zum Finanzplan an Tom Kraus']);
    const julLinks = await withUser(uid('julia'), (tx) => tx.select().from(links).where(eq(links.entry_id, m05.id)));
    expect(julLinks.length).toBeGreaterThan(0);
  });

  it('a duplicate mail from two mailboxes is one entry', async () => {
    const m09 = await entryOf('m09');
    expect(m09.visibility).toBe('restricted');
    expect([...m09.visible_to].sort()).toEqual([uid('andreas'), uid('julia')].sort());
    const all = await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, m09.dedupe_key)));
    expect(all).toHaveLength(1);
  });

  it('a freemail domain creates no organisation', async () => {
    const m06 = await entryOf('m06');
    const freemail = await withSystem((tx) =>
      tx.select().from(orgs).where(sql`${orgs.domains} && ${'{gmx.example,web.example,gmail.example,outlook.example,t-online.example}'}::text[] OR ${orgs.name} ILIKE '%gmx%'`),
    );
    expect(freemail).toEqual([]);
    // low confidence: nothing applied, a question instead
    expect(await linksOf(m06.id)).toEqual([]);
    const [hint] = await withSystem((tx) => tx.select().from(hints).where(eq(hints.target_id, m06.id)));
    expect(hint).toMatchObject({
      kind: 'clarify',
      user_id: uid('andreas'),
      text: 'Ist „Lisa“ (l.meier@gmx.example) Lisa Meier von Solaro?',
      status: 'open',
    });
  });
});

// --- rls_checks from expected.json ------------------------------------------

describe('rls_checks', () => {
  for (const check of expected.rls_checks) {
    const what = 'entry' in check ? `entry ${check.entry}` : `task from ${check.task_from}`;
    it(`${check.as}: ${what} → ${check.expect}`, async () => {
      if ('task_from' in check) {
        const e = await entryOf(check.task_from);
        const seen = await withUser(uid(check.as), (tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, e.id)));
        expect(check.expect).toBe('visible');
        expect(seen.length).toBeGreaterThan(0);
        return;
      }
      const e = await entryOf(check.entry);
      const row = await canSee(check.as, e.id);
      if (check.expect === 'full') {
        expect(row).toMatchObject({ id: e.id, body_text: e.body_text, title: e.title });
      } else {
        expect(check.expect).toBe('stub_only');
        expect(row).toBeUndefined();
        const stubs = await stubsFor(check.as, e.id);
        expect(stubs.some((s) => (s.occurred_at as Date).getTime() === e.occurred_at.getTime())).toBe(true);
        expect(JSON.stringify(stubs)).not.toContain(e.title!);
      }
    });
  }
});

// --- per-item asserts from expected.json -----------------------------------

/** assert keys checked here; the others belong to later stages (see STAND.md) */
const CHECKED = [
  'visibility', 'visible_to', 'review_state', 'creates', 'link_origin', 'note', 'attachment_entry',
  'tasks_visible_to_team', 'no_org_for_domain', 'hint', 'after_answer_yes', 'andreas_sees', 'also_link',
  'single_entry', 'no_founding_team_created', 'processing_state', 'reason', 'nothing_created', 'historical',
  'folder_hint', 'metadata_only',
];
const LATER: Record<string, string> = {
  team_overview: 'Stufe 2 (Ansicht Heute/Team)',
  open_question_in_waiting_on_us: 'Stufe 2/8 („wartet auf uns“)',
  predecessor_suggested: 'Stufe 8: geprüft in tests/hinweise.test.ts (Frage „Ist … der Vorgänger?“, Entscheidung 41)',
  fields_suggested: 'offene Frage: Feldvorschläge zu bestehenden Vorgängen sind im Schema §7.2.4 nicht vorgesehen',
  linked_by_folder_to: 'offene Frage: f5 liegt allein im Ordner, die Ordnerregel §7.2.2 greift nicht',
  used_for_advice_in_stage_8: 'Stufe 8: geprüft in tests/hinweise.test.ts (Rat mit Beleg aus dem Rückblick f4)',
};

describe('expected.json item asserts', () => {
  it('every assert key is either checked or explicitly deferred', () => {
    const keys = new Set(Object.values(expected.items).flatMap((i) => Object.keys(i.assert)));
    const unknown = [...keys].filter((k) => !CHECKED.includes(k) && !(k in LATER));
    expect(unknown).toEqual([]);
  });

  for (const [key, item] of Object.entries(expected.items)) {
    const a = item.assert;
    const checked = Object.keys(a).filter((k) => CHECKED.includes(k) && k !== 'note');
    if (!checked.length) continue;
    it(`${key}: ${checked.join(', ')}`, async () => {
      const e = await entryOf(key);
      const userKeyOf = (id: string) => Object.entries(fx.users).find(([, u]) => u === id)![0];

      if (a.visibility) expect(e.visibility).toBe(a.visibility);
      if (a.visible_to) expect(e.visible_to.map(userKeyOf).sort()).toEqual([...(a.visible_to as string[])].sort());
      if (a.single_entry) {
        const n = await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, e.dedupe_key)));
        expect(n).toHaveLength(1);
      }
      if (a.processing_state) {
        expect(e.processing_state).toBe(a.processing_state);
        expect((e.meta as { skip_reason?: string }).skip_reason).toBe(a.reason);
      } else if ((item.model as { relevant?: boolean } | null)?.relevant === false) {
        expect(e.processing_state).toBe('skipped');
        expect((e.meta as { skip_reason?: string }).skip_reason).toBe('irrelevant');
      } else if (!a.hint) {
        expect(e.processing_state).toBe('done');
      }
      if (a.historical) expect(e.historical).toBe(true);

      const l = await linksOf(e.id);
      if (a.creates) {
        for (const c of a.creates as string[]) {
          const [kind, k] = c.split(':') as ['org' | 'person' | 'matter', string];
          const id = await idOf(kind, k);
          expect(l.some((x) => x.target_id === id), `${key} linked to ${c}`).toBe(true);
          const tbl = kind === 'org' ? orgs : kind === 'person' ? people : matters;
          const [row] = await withSystem((tx) => tx.select().from(tbl).where(eq(tbl.id, id)));
          expect(row!.review_state).toBe('unreviewed');
        }
      }
      if (a.review_state && !a.creates) {
        // m10, f6: the matter this entry created, linked with the oracle's confidence
        const ml = l.filter((x) => x.target_type === 'matter');
        expect(ml).toHaveLength(1);
        const [m] = await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, ml[0]!.target_id)));
        expect(m!.review_state).toBe(a.review_state);
        expect(ml[0]!.confidence).toBe((item.model as { confidence: string }).confidence);
      }
      if (a.link_origin) {
        // m02: thread → matter; e1: attendees → people
        const want = key === 'm02' ? 'matter' : 'person';
        const ofType = l.filter((x) => x.target_type === want);
        expect(ofType.length).toBeGreaterThan(0);
        expect(ofType.every((x) => x.origin === a.link_origin)).toBe(true);
      }
      if (a.folder_hint) {
        const m = await idOf('matter', 'solaro_exist');
        expect(l.find((x) => x.target_id === m)).toMatchObject({ origin: 'rule' });
        expect((e.meta as { path: string }).path.startsWith(a.folder_hint as string)).toBe(true);
      }
      if (a.attachment_entry) {
        const att = await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'mail_entry_id' = ${e.id}`));
        expect(att).toHaveLength(1);
        expect(att[0]).toMatchObject({ kind: 'file', visibility: e.visibility, visible_to: e.visible_to, processing_state: 'done' });
        expect(att[0]!.body_text).toBeTruthy();
      }
      if (a.tasks_visible_to_team) {
        for (const u of ['julia', 'mehmet']) {
          const seen = await withUser(uid(u), (tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, e.id)));
          expect(seen.length, `${u} sees tasks of ${key}`).toBeGreaterThan(0);
        }
      }
      if (a.andreas_sees) {
        expect(a.andreas_sees).toBe('stub + task');
        expect(await canSee('andreas', e.id)).toBeUndefined();
        expect((await stubsFor('andreas', e.id)).length).toBeGreaterThan(0);
        const t = await withUser(uid('andreas'), (tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, e.id)));
        expect(t.length).toBeGreaterThan(0);
      }
      if (a.also_link) {
        const [kind, k] = (a.also_link as string).split(':') as ['org', string];
        expect(l.map((x) => x.target_id)).toContain(await idOf(kind, k));
      }
      if (a.no_org_for_domain) {
        const o = await withSystem((tx) => tx.select().from(orgs).where(sql`${a.no_org_for_domain as string} = ANY(${orgs.domains})`));
        expect(o).toEqual([]);
      }
      if (a.hint) {
        const h = await withSystem((tx) => tx.select().from(hints).where(and(eq(hints.target_type, 'entry'), eq(hints.target_id, e.id))));
        expect(h).toMatchObject([{ kind: a.hint, status: 'open' }]);
      }
      if (a.nothing_created) {
        expect(l).toEqual([]);
        const t = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, e.id)));
        expect(t).toEqual([]);
      }
      if (a.no_founding_team_created) {
        expect(l).toEqual([]);
        const teams = await withSystem((tx) => tx.select({ name: orgs.name }).from(orgs).where(eq(orgs.role, 'founding_team')));
        expect(teams.map((t) => t.name).sort()).toEqual(['Greenbyte', 'Kitchen Loop', 'Solaro']);
      }
      if (a.metadata_only) {
        expect(e.body_text).toBeNull();
        expect(e.processing_state).toBe('done');
      }
      if (a.after_answer_yes) {
        // m06: answering "yes" assigns the freemail address to Lisa Meier
        const [h] = await withSystem((tx) => tx.select().from(hints).where(eq(hints.target_id, e.id)));
        const options = h!.options as { label: string; action_type: string; payload: Record<string, unknown> }[];
        expect(options.map((o) => o.label)).toEqual(['Ja, das ist Lisa Meier', 'Nein']);
        const yes = options[0]!;
        await runAction({ type: 'user', userId: uid('andreas') }, yes.action_type, yes.payload);
        const lisa = await idOf('person', 'lisa');
        const mails = await withSystem((tx) => tx.select().from(personEmails).where(eq(personEmails.person_id, lisa)));
        expect(mails.map((m) => m.email).sort()).toEqual(['l.meier@gmx.example', 'lisa@solaro.example']);
      }
    });
  }
});

// --- the hint is only for those who may see the mail ------------------------

describe('clarify hints of restricted mail', () => {
  it('are personal to the mailbox owner', async () => {
    const m13 = await entryOf('m13');
    const forJulia = await withUser(uid('julia'), (tx) => tx.select().from(hints).where(eq(hints.target_id, m13.id)));
    expect(forJulia).toEqual([]);
    const forAndreas = await withUser(uid('andreas'), (tx) => tx.select().from(hints).where(eq(hints.target_id, m13.id)));
    expect(forAndreas).toMatchObject([{ kind: 'clarify', options: [{ label: 'Verwerfen', action_type: 'hint.dismiss' }] }]);
  });
});

