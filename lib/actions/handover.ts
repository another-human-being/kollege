// "Übergeben an" (E45) for matters and organisations ("betreut von"): the responsibility
// stays with the current person until the recipient accepts; withdraw or decline ends it.
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/lib/db/client';
import { matters, orgs } from '@/lib/db/schema';
import { updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError, type ActionContext } from './types';

const KINDS = { matter: { table: matters, name: 'matters' }, org: { table: orgs, name: 'orgs' } } as const;

function userOf(ctx: ActionContext): string {
  if (ctx.actor.type === 'system') throw new ActionError('handovers are made by people');
  return ctx.actor.userId;
}

async function load(tx: Tx, kind: keyof typeof KINDS, id: string) {
  const t = KINDS[kind].table;
  const [row] = await tx.select({ owner: t.owner_user_id, to: t.handover_to }).from(t).where(eq(t.id, id));
  if (!row) throw new ActionError(`${kind} ${id} not found`);
  return row;
}

for (const kind of ['matter', 'org'] as const) {
  const { table, name } = KINDS[kind];

  defineAction({
    type: `${kind}.handover`,
    schema: z.object({ id: z.uuid(), to_user_id: z.uuid() }),
    external: false,
    allowedActors: ['user', 'model'],
    async apply(tx, { id, to_user_id }, ctx) {
      const me = userOf(ctx);
      const row = await load(tx, kind, id);
      if (row.owner !== me) throw new ActionError('only the person responsible can hand over');
      if (to_user_id === me) throw new ActionError('cannot hand over to yourself');
      return { result: { id }, inverse: [await updateWithInverse(tx, table, name, id, { handover_to: to_user_id })] };
    },
  });

  defineAction({
    type: `${kind}.handover_accept`,
    schema: z.object({ id: z.uuid() }),
    external: false,
    allowedActors: ['user'],
    async apply(tx, { id }, ctx) {
      const me = userOf(ctx);
      const row = await load(tx, kind, id);
      if (row.to !== me) throw new ActionError('no handover to you pending');
      return { result: { id }, inverse: [await updateWithInverse(tx, table, name, id, { owner_user_id: me, handover_to: null })] };
    },
  });

  defineAction({
    type: `${kind}.handover_withdraw`,
    schema: z.object({ id: z.uuid() }),
    external: false,
    allowedActors: ['user'],
    async apply(tx, { id }, ctx) {
      const me = userOf(ctx);
      const row = await load(tx, kind, id);
      if (row.to === null) throw new ActionError('no handover pending');
      if (me !== row.owner && me !== row.to) throw new ActionError('not your handover');
      return { result: { id }, inverse: [await updateWithInverse(tx, table, name, id, { handover_to: null })] };
    },
  });
}

/** direct assignment only while nobody is responsible (E45) */
export async function assertUnowned(tx: Tx, kind: keyof typeof KINDS, id: string): Promise<void> {
  const row = await load(tx, kind, id);
  if (row.owner !== null) throw new ActionError('someone is responsible already – hand over instead');
}
