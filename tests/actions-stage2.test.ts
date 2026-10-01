// Stage 2 actions on the imported fixtures. Mirrors the manual acceptance of §13
// (create an event, change a field, check off a task, undo, review – also in bulk)
// at the level of the action layer; the interface follows once the design export is in.
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { answerHint, runAction, undoAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { areas, entries, hints, links, matters, orgs, people, personEmails, tasks } from '@/lib/db/schema';
import { createEntry, expectRejects, importFixtures } from './helpers';

let fx: Awaited<ReturnType<typeof importFixtures>>;
beforeAll(async () => {
  fx = await importFixtures();
});
afterAll(() => closeDb());

const as = (key: string) => ({ type: 'user' as const, userId: fx.users[key]! });
const matterByTitle = async (title: string) =>
  (await withSystem((tx) => tx.select().from(matters).where(eq(matters.title, title))))[0]!;
const reload = async (id: string) => (await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, id))))[0]!;
const entryOf = async (key: string) =>
  (await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' = ${key}`)))[0]!;

describe('areas: create an event, change a field, undo', () => {
  it('creates an event by hand – accepted, no KI-Vermutung', async () => {
    const { result } = await runAction<{ id: string }>(as('julia'), 'matter.create', {
      area_key: 'events', title: 'Pitch-Training', fields: { date: '2026-10-15', location: 'Raum 2.14' }, phase: 'Planung',
      owner_user_id: fx.users.julia,
    });
    const m = await reload(result.id);
    expect(m).toMatchObject({ review_state: 'accepted', created_by_type: 'user', phase: 'Planung', owner_user_id: fx.users.julia });
  });

  it('changes a single field, keeps the others, and undoes the change', async () => {
    const gn = await matterByTitle('Gründungsnacht 2026');
    await runAction(as('julia'), 'matter.update', { id: gn.id, fields: { location: 'Hörsaalzentrum' } });
    const { actionId } = await runAction(as('julia'), 'matter.update', { id: gn.id, fields: { capacity: 60, location: null } });
    expect((await reload(gn.id)).fields).toEqual({ capacity: 60 });
    await undoAction(actionId, fx.users.julia!);
    expect((await reload(gn.id)).fields).toEqual({ location: 'Hörsaalzentrum' });
  });

  it('refuses fields and phases the area does not have', async () => {
    const gn = await matterByTitle('Gründungsnacht 2026');
    await expectRejects(runAction(as('julia'), 'matter.update', { id: gn.id, fields: { semester: 'WS' } }), /no field/);
    await expectRejects(runAction(as('julia'), 'matter.update', { id: gn.id, phase: 'Idee' }), /no phase/);
  });

  it('sets status and owner, each undoable', async () => {
    const eb = await matterByTitle('Entrepreneurship Basics WS 26/27');
    const s = await runAction(as('andreas'), 'matter.set_status', { id: eb.id, status: 'done' });
    const a = await runAction(as('andreas'), 'matter.assign', { id: eb.id, owner_user_id: fx.users.mehmet });
    expect(await reload(eb.id)).toMatchObject({ status: 'done', owner_user_id: fx.users.mehmet });
    await undoAction(a.actionId, fx.users.andreas!);
    await undoAction(s.actionId, fx.users.andreas!);
    expect(await reload(eb.id)).toMatchObject({ status: 'open', owner_user_id: fx.users.andreas });
  });

  it('creates from the previous year where the area offers it, copying place and seats only', async () => {
    const gn25 = await matterByTitle('Gründungsnacht 2025');
    await runAction(as('julia'), 'matter.update', {
      id: gn25.id, fields: { date: '2025-11-21', location: 'Hörsaalzentrum', capacity: 60, registrations: 18 },
    });
    const { result } = await runAction<{ id: string }>(as('julia'), 'matter.create_from_previous', {
      previous_id: gn25.id, title: 'Gründungsnacht 2027',
    });
    expect(await reload(result.id)).toMatchObject({
      predecessor_id: gn25.id, owner_user_id: fx.users.julia, review_state: 'accepted',
      fields: { location: 'Hörsaalzentrum', capacity: 60 },
    });
    // founding teams only offer "new"
    const solaro = await matterByTitle('EXIST-Antrag');
    await expectRejects(runAction(as('andreas'), 'matter.create_from_previous', { previous_id: solaro.id, title: 'X' }), /does not offer/);
  });
});

describe('tasks', () => {
  it('checks off a task and undoes it', async () => {
    const [t] = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Feedback zum Finanzplan an Tom Kraus')));
    const { actionId } = await runAction(as('andreas'), 'task.complete', { id: t!.id });
    const done = (await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.id, t!.id))))[0]!;
    expect(done.status).toBe('done');
    expect(done.done_at).toBeInstanceOf(Date);
    await undoAction(actionId, fx.users.andreas!);
    expect((await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.id, t!.id))))[0]).toMatchObject({ status: 'open', done_at: null });
  });

  it('assigns ours to users and theirs to people only', async () => {
    const [ours] = await withSystem((tx) => tx.select().from(tasks).where(and(eq(tasks.direction, 'ours'), eq(tasks.title, 'Kontakt zur IHK für Jury/Mentoring prüfen'))));
    const [theirs] = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Pitchdeck schicken')));
    const [lisa] = await withSystem((tx) => tx.select().from(personEmails).where(eq(personEmails.email, 'lisa@solaro.example')));
    await runAction(as('andreas'), 'task.assign', { id: ours!.id, owner_user_id: fx.users.julia });
    await runAction(as('andreas'), 'task.assign', { id: theirs!.id, owner_person_id: lisa!.person_id });
    await expectRejects(runAction(as('andreas'), 'task.assign', { id: ours!.id, owner_person_id: lisa!.person_id }), /owed by a user/);
    const after = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.id, theirs!.id)));
    expect(after[0]!.owner_person_id).toBe(lisa!.person_id);
  });
});

describe('review: take over or discard – one or all', () => {
  it('accepts all unreviewed matters at once and undoes that in one step', async () => {
    const open = await withSystem((tx) => tx.select({ id: matters.id }).from(matters).where(eq(matters.review_state, 'unreviewed')));
    expect(open.length).toBe(8);
    const { actionId, result } = await runAction<{ count: number }>(as('andreas'), 'review.accept', {
      items: open.map((m) => ({ type: 'matter', id: m.id })),
    });
    expect(result.count).toBe(8);
    const left = await withSystem((tx) => tx.select().from(matters).where(eq(matters.review_state, 'unreviewed')));
    expect(left).toEqual([]);
    await undoAction(actionId, fx.users.andreas!);
    const back = await withSystem((tx) => tx.select().from(matters).where(eq(matters.review_state, 'unreviewed')));
    expect(back).toHaveLength(8);
  });

  it('discards with a reason (kept as correction example)', async () => {
    const [ben] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Ben Hofer')));
    const [ihk] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'IHK Schwaben')));
    const { actionId } = await runAction(as('julia'), 'review.discard', {
      items: [{ type: 'person', id: ben!.id }, { type: 'org', id: ihk!.id }], reason: 'kein Kontakt für uns',
    });
    const [b] = await withSystem((tx) => tx.select().from(people).where(eq(people.id, ben!.id)));
    expect(b).toMatchObject({ review_state: 'discarded', discard_reason: 'kein Kontakt für uns' });
    await undoAction(actionId, fx.users.julia!);
    const [b2] = await withSystem((tx) => tx.select().from(people).where(eq(people.id, ben!.id)));
    expect(b2).toMatchObject({ review_state: 'unreviewed', discard_reason: null });
  });
});

describe('corrections instead of undoing system steps (decision 7)', () => {
  it('unlinks a system assignment; undo restores the very same link', async () => {
    const f3 = await entryOf('f3');
    const [l] = await withSystem((tx) => tx.select().from(links).where(and(eq(links.entry_id, f3.id), eq(links.target_type, 'matter'))));
    const { actionId } = await runAction(as('julia'), 'entry.unlink', { link_id: l!.id });
    expect(await withSystem((tx) => tx.select().from(links).where(eq(links.id, l!.id)))).toEqual([]);
    await undoAction(actionId, fx.users.julia!);
    const [restored] = await withSystem((tx) => tx.select().from(links).where(eq(links.id, l!.id)));
    expect(restored).toEqual(l);
  });

  it('moves an assignment to another matter – now origin human', async () => {
    const f6 = await entryOf('f6');
    const [l] = await withSystem((tx) => tx.select().from(links).where(and(eq(links.entry_id, f6.id), eq(links.target_type, 'matter'))));
    const gn = await matterByTitle('Gründungsnacht 2026');
    const { actionId } = await runAction(as('mehmet'), 'entry.relink', { link_id: l!.id, target_type: 'matter', target_id: gn.id });
    const [moved] = await withSystem((tx) => tx.select().from(links).where(eq(links.id, l!.id)));
    expect(moved).toMatchObject({ target_id: gn.id, origin: 'human', confidence: 'high' });
    await undoAction(actionId, fx.users.mehmet!);
    const [back] = await withSystem((tx) => tx.select().from(links).where(eq(links.id, l!.id)));
    expect(back).toMatchObject({ target_id: l!.target_id, origin: 'model', confidence: 'medium' });
  });

  it('nobody corrects links of entries they cannot see', async () => {
    const m05 = await entryOf('m05');
    const [l] = await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, m05.id)));
    await expectRejects(runAction(as('julia'), 'entry.unlink', { link_id: l!.id }), /not found/);
  });
});

describe('clarify: answering a hint', () => {
  it('runs the button action and resolves the hint – one undo reverts both', async () => {
    const m06 = await entryOf('m06');
    const [h] = await withSystem((tx) => tx.select().from(hints).where(eq(hints.target_id, m06.id)));
    // Julia cannot see Andreas' personal hint
    await expectRejects(answerHint(fx.users.julia!, h!.id, 0), /not found/);
    const { actionId } = await answerHint(fx.users.andreas!, h!.id, 0);
    const state = async () => ({
      hint: (await withSystem((tx) => tx.select().from(hints).where(eq(hints.id, h!.id))))[0]!.status,
      gmx: (await withSystem((tx) => tx.select().from(personEmails).where(eq(personEmails.email, 'l.meier@gmx.example')))).length,
    });
    expect(await state()).toEqual({ hint: 'done', gmx: 1 });
    await expectRejects(answerHint(fx.users.andreas!, h!.id, 0), /no longer open/);
    await undoAction(actionId, fx.users.andreas!);
    expect(await state()).toEqual({ hint: 'open', gmx: 0 });
  });
});

describe('settings', () => {
  it('changes an area and undoes it', async () => {
    const [social] = await withSystem((tx) => tx.select().from(areas).where(eq(areas.key, 'social')));
    const { actionId } = await runAction(as('mehmet'), 'area.update', { id: social!.id, name_plural: 'Beiträge', phases: ['Idee', 'Entwurf'] });
    expect((await withSystem((tx) => tx.select().from(areas).where(eq(areas.id, social!.id))))[0]).toMatchObject({ name_plural: 'Beiträge', phases: ['Idee', 'Entwurf'] });
    await undoAction(actionId, fx.users.mehmet!);
    expect((await withSystem((tx) => tx.select().from(areas).where(eq(areas.id, social!.id))))[0]).toMatchObject({ name_plural: 'Social Media', phases: social!.phases });
  });

  it('changes and deletes an instruction; undo brings it back with its full text search', async () => {
    const id = await createEntry({
      kind: 'instruction', body_text: 'Social-Media-Hinweise nur montags.', visibility: 'restricted', visible_to: [fx.users.mehmet!],
      instruction_user_id: fx.users.mehmet,
    });
    await runAction(as('mehmet'), 'instruction.update', { id, body_text: 'Social-Media-Hinweise nur montags und donnerstags.' });
    // someone else's personal instruction is invisible
    await expectRejects(runAction(as('julia'), 'instruction.delete', { id }), /not found/);
    const { actionId } = await runAction(as('mehmet'), 'instruction.delete', { id });
    expect(await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, id)))).toEqual([]);
    await undoAction(actionId, fx.users.mehmet!);
    const hit = await withSystem((tx) =>
      tx.select().from(entries).where(sql`${entries.id} = ${id} AND ${entries.search} @@ plainto_tsquery('german', 'donnerstags')`),
    );
    expect(hit).toHaveLength(1);
  });
});
