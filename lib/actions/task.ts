import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { tasks } from '@/lib/db/schema';
import { ALL_ACTORS, defined, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

export const taskCreate = defineAction({
  type: 'task.create',
  schema: z
    .object({
      title: z.string().min(1),
      direction: z.enum(['ours', 'theirs']),
      owner_user_id: z.uuid().optional(),
      owner_person_id: z.uuid().optional(),
      due_at: z.iso.datetime({ offset: true }).optional(),
      matter_id: z.uuid().optional(),
      org_id: z.uuid().optional(),
      source_entry_id: z.uuid().optional(),
      visibility: z.enum(['team', 'private']).default('team'),
    })
    .refine((t) => (t.direction === 'ours' ? !t.owner_person_id : !t.owner_user_id), {
      message: 'ours is owed by a user, theirs by a person',
    }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { due_at, ...p }, ctx) {
    if (p.visibility === 'private' && ctx.actor.type === 'system') {
      throw new ActionError('the system cannot create private tasks');
    }
    const [row] = await tx
      .insert(tasks)
      .values({
        ...p,
        due_at: due_at ? new Date(due_at) : undefined,
        owner_of_private: p.visibility === 'private' && ctx.actor.type !== 'system' ? ctx.actor.userId : undefined,
        action_id: ctx.actionId,
      })
      .returning({ id: tasks.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'tasks', id: row!.id }] };
  },
});

export const taskUpdate = defineAction({
  type: 'task.update',
  schema: z.object({
    id: z.uuid(),
    title: z.string().min(1).optional(),
    due_at: z.iso.datetime({ offset: true }).nullable().optional(),
    matter_id: z.uuid().nullable().optional(),
    org_id: z.uuid().nullable().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, due_at, ...p }) {
    const set = defined({ ...p, due_at: due_at === undefined ? undefined : due_at === null ? null : new Date(due_at) });
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, tasks, 'tasks', id, set)] };
  },
});

export const taskComplete = defineAction({
  type: 'task.complete',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id }) {
    return { result: { id }, inverse: [await updateWithInverse(tx, tasks, 'tasks', id, { status: 'done', done_at: new Date() })] };
  },
});

export const taskReopen = defineAction({
  type: 'task.reopen',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id }) {
    return { result: { id }, inverse: [await updateWithInverse(tx, tasks, 'tasks', id, { status: 'open', done_at: null })] };
  },
});

export const taskAssign = defineAction({
  type: 'task.assign',
  schema: z.object({ id: z.uuid(), owner_user_id: z.uuid().nullable().optional(), owner_person_id: z.uuid().nullable().optional() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, ...owner }) {
    const [t] = await tx.select({ direction: tasks.direction }).from(tasks).where(eq(tasks.id, id));
    if (!t) throw new ActionError(`task ${id} not found`);
    // ours is owed by a user, theirs by a person
    const set = t.direction === 'ours'
      ? { owner_user_id: owner.owner_user_id ?? null }
      : { owner_person_id: owner.owner_person_id ?? null };
    if ((t.direction === 'ours' && owner.owner_person_id) || (t.direction === 'theirs' && owner.owner_user_id)) {
      throw new ActionError('ours is owed by a user, theirs by a person');
    }
    return { result: { id }, inverse: [await updateWithInverse(tx, tasks, 'tasks', id, set)] };
  },
});
