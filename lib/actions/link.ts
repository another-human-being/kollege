import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { links, matters, orgs, people } from '@/lib/db/schema';
import { ALL_ACTORS } from './helpers';
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
