import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { links, matters, orgs, people } from '@/lib/db/schema';
import { ALL_ACTORS, deleteWithInverse, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

const targets = { matter: matters, person: people, org: orgs } as const;

export const entryLink = defineAction({
  type: 'entry.link',
  schema: z.object({
    entry_id: z.uuid(),
    target_type: z.enum(['matter', 'person', 'org']),
    target_id: z.uuid(),
    origin: z.enum(['rule', 'model', 'human']).optional(),
    confidence: z.enum(['high', 'medium', 'low']).default('high'),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, p, ctx) {
    // a person links by hand, the model as model; only the pipeline knows rule vs. model
    const origin = ctx.actor.type === 'user' ? 'human' : ctx.actor.type === 'model' ? 'model' : p.origin;
    if (!origin) throw new ActionError('system links need an origin');
    const table = targets[p.target_type];
    const [target] = await tx.select({ id: table.id }).from(table).where(eq(table.id, p.target_id));
    if (!target) throw new ActionError(`${p.target_type} ${p.target_id} not found`);
    const [row] = await tx
      .insert(links)
      .values({ ...p, origin, action_id: ctx.actionId })
      .returning({ id: links.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'links', id: row!.id }] };
  },
});

/** correction: remove an assignment (decision 7: corrections instead of undoing system steps) */
export const entryUnlink = defineAction({
  type: 'entry.unlink',
  schema: z.object({ link_id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { link_id }) {
    return { result: { id: link_id }, inverse: [await deleteWithInverse(tx, links, 'links', link_id)] };
  },
});

/** correction: move an assignment to another target */
export const entryRelink = defineAction({
  type: 'entry.relink',
  schema: z.object({ link_id: z.uuid(), target_type: z.enum(['matter', 'person', 'org']), target_id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { link_id, target_type, target_id }, ctx) {
    const table = targets[target_type];
    const [target] = await tx.select({ id: table.id }).from(table).where(eq(table.id, target_id));
    if (!target) throw new ActionError(`${target_type} ${target_id} not found`);
    const origin = ctx.actor.type === 'user' ? 'human' : 'model';
    const inverse = await updateWithInverse(tx, links, 'links', link_id, {
      target_type, target_id, origin, confidence: 'high', action_id: ctx.actionId,
    });
    return { result: { id: link_id }, inverse: [inverse] };
  },
});
