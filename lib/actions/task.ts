import { z } from 'zod';
import { tasks } from '@/lib/db/schema';
import { ALL_ACTORS } from './helpers';
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
