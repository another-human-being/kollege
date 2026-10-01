import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineAction, runAction, undoAction } from '@/lib/actions';
import { closeDb, withSystem, withUser } from '@/lib/db/client';
import { actions, areas, hints, links, matters, orgs, tasks } from '@/lib/db/schema';
import { createEntry, createUser, expectRejects } from './helpers';

let anna: string;
let ben: string;

beforeAll(async () => {
  anna = await createUser('Anna');
  ben = await createUser('Ben');
  await runAction({ type: 'system' }, 'area.create', {
    key: 'act_test', name_singular: 'Test', name_plural: 'Tests', matter_kind: 'item',
    fields: [{ key: 'channel', label: 'Kanal', type: 'text' }],
  });
});
afterAll(() => closeDb());

const user = (id: string) => ({ type: 'user' as const, userId: id });

describe('runAction', () => {
  it('applies, records the action and its inverse', async () => {
    const { actionId, result } = await runAction<{ id: string }>(user(anna), 'matter.create', {
      area_key: 'act_test', title: 'Testbeitrag', fields: { channel: 'Instagram' },
    });
    const [a] = await withSystem((tx) => tx.select().from(actions).where(eq(actions.id, actionId)));
    expect(a).toMatchObject({ actor_type: 'user', actor_user_id: anna, type: 'matter.create' });
    expect(a!.inverse).toEqual([{ op: 'delete', table: 'matters', id: result.id }]);
    const [m] = await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, result.id)));
    expect(m).toMatchObject({ review_state: 'accepted', created_by_type: 'user' });
  });

  it('validates the payload with Zod', async () => {
    await expectRejects(runAction(user(anna), 'matter.create', { area_key: 'act_test' }), /title/);
    await expectRejects(
      runAction(user(anna), 'matter.create', { area_key: 'act_test', title: 'X', fields: { nope: 1 } }),
      /no field/,
    );
  });

  it('system-created objects are unreviewed', async () => {
    const { result } = await runAction<{ id: string }>({ type: 'system' }, 'org.create', { name: 'Sys GmbH' });
    const [o] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.id, result.id)));
    expect(o!.review_state).toBe('unreviewed');
  });

  it('refuses freemail and team domains for organisations', async () => {
    await expectRejects(
      runAction({ type: 'system' }, 'org.create', { name: 'gmx', domains: ['gmx.example'] }),
      /freemail/,
    );
    await expectRejects(
      runAction(user(anna), 'org.create', { name: 'Wir', domains: ['gruendung.uni-augsburg.example'] }),
      /team domain/,
    );
  });

  it('actor model never runs an external action – even if allowed by the definition', async () => {
    defineAction({
      type: 'test.external',
      schema: z.object({}),
      external: true,
      allowedActors: ['user', 'system', 'model'],
      async apply() {
        return { result: null, inverse: null };
      },
    });
    await expectRejects(
      runAction({ type: 'model', userId: anna }, 'test.external', {}),
      /model may not run external/,
    );
    // a user may, but it cannot be undone
    const { actionId } = await runAction(user(anna), 'test.external', {});
    await expectRejects(undoAction(actionId, anna), /cannot be undone/);
  });

  it('a passed transaction must match the actor', async () => {
    await expectRejects(
      withSystem((tx) => runAction(user(anna), 'org.create', { name: 'X' }, { tx })),
      /context does not match/,
    );
    await expectRejects(
      withUser(ben, (tx) => runAction(user(anna), 'org.create', { name: 'X' }, { tx })),
      /context does not match/,
    );
  });
});

describe('undoAction', () => {
  it('undoes follow-up steps first (youngest first), then the action', async () => {
    const entryId = await createEntry();
    const parent = await runAction<{ id: string }>(user(anna), 'matter.create', { area_key: 'act_test', title: 'Mit Folgen' });
    const opts = { parentActionId: parent.actionId };
    const link = await runAction(user(anna), 'entry.link', { entry_id: entryId, target_type: 'matter', target_id: parent.result.id }, opts);
    const task = await runAction<{ id: string }>(user(anna), 'task.create', {
      title: 'Folgeaufgabe', direction: 'ours', owner_user_id: anna, matter_id: parent.result.id,
    }, opts);
    // a follow-up of a follow-up
    const hint = await runAction(user(anna), 'hint.create', {
      kind: 'handover', text: 'Kurzstand', user_id: anna, dedupe_key: `test:${task.result.id}`,
    }, { parentActionId: task.actionId });

    // task references the matter: undoing the matter first would violate the FK
    await undoAction(parent.actionId, anna);

    await withSystem(async (tx) => {
      expect(await tx.select().from(matters).where(eq(matters.id, parent.result.id))).toHaveLength(0);
      expect(await tx.select().from(tasks).where(eq(tasks.id, task.result.id))).toHaveLength(0);
      expect(await tx.select().from(links).where(eq(links.entry_id, entryId))).toHaveLength(0);
      expect(await tx.select().from(hints).where(eq(hints.dedupe_key, `test:${task.result.id}`))).toHaveLength(0);
      const done = await tx
        .select()
        .from(actions)
        .where(inArray(actions.id, [parent.actionId, link.actionId, task.actionId, hint.actionId]));
      expect(done.every((a) => a.undone_at !== null && a.undone_by === anna)).toBe(true);
      // youngest child first, a grandchild before its parent, the action last
      const order = done.sort((a, b) => a.undone_at!.getTime() - b.undone_at!.getTime()).map((a) => a.id);
      expect(order).toEqual([hint.actionId, task.actionId, link.actionId, parent.actionId]);
    });
    await expectRejects(undoAction(parent.actionId, anna), /already undone/);
  });

  it('restores previous values for updates', async () => {
    const h = await runAction<{ id: string }>({ type: 'system' }, 'hint.create', {
      kind: 'clarify', text: 'Frage?', dedupe_key: 'test:dismiss',
    });
    const d = await runAction(user(anna), 'hint.dismiss', { hint_id: h.result.id });
    const status = async () =>
      (await withSystem((tx) => tx.select().from(hints).where(eq(hints.id, h.result.id))))[0]!.status;
    expect(await status()).toBe('dismissed');
    await undoAction(d.actionId, anna);
    expect(await status()).toBe('open');
  });

  it('nobody undoes the actions of someone else', async () => {
    const { actionId } = await runAction(user(anna), 'org.create', { name: 'Annas Org' });
    await expectRejects(undoAction(actionId, ben), /not found/);
  });

  it('a failed undo changes nothing', async () => {
    const parent = await runAction<{ id: string }>(user(anna), 'matter.create', { area_key: 'act_test', title: 'Halb' });
    const child = await runAction(user(anna), 'hint.create', { kind: 'advice', text: 'x', dedupe_key: 'test:half' }, { parentActionId: parent.actionId });
    // the matter is meanwhile referenced by a task outside the undo tree
    await runAction(user(ben), 'task.create', { title: 'fremd', direction: 'ours', owner_user_id: ben, matter_id: parent.result.id });
    await expectRejects(undoAction(parent.actionId, anna), /foreign key|violates/);
    const [c] = await withSystem((tx) => tx.select().from(actions).where(eq(actions.id, child.actionId)));
    expect(c!.undone_at).toBeNull();
  });
});

describe('area seed', () => {
  it('area.create stores fields and phases', async () => {
    const [a] = await withSystem((tx) => tx.select().from(areas).where(eq(areas.key, 'act_test')));
    expect(a!.fields).toEqual([{ key: 'channel', label: 'Kanal', type: 'text' }]);
  });
});
