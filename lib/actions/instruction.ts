// Instructions are entries (kind 'instruction'). Created through the chat (stage 3, §11:
// one input field); stage 2 settings can change and delete them.
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/lib/db/client';
import { entries } from '@/lib/db/schema';
import { ALL_ACTORS, defined, deleteWithInverse, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

async function assertInstruction(tx: Tx, id: string) {
  const [e] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.id, id), eq(entries.kind, 'instruction')));
  if (!e) throw new ActionError(`instruction ${id} not found`);
}

export const instructionUpdate = defineAction({
  type: 'instruction.update',
  schema: z.object({
    id: z.uuid(),
    body_text: z.string().trim().min(1).optional(),
    instruction_area_id: z.uuid().nullable().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, ...p }) {
    await assertInstruction(tx, id);
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, entries, 'entries', id, set)] };
  },
});

export const instructionDelete = defineAction({
  type: 'instruction.delete',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id }) {
    await assertInstruction(tx, id);
    return { result: { id }, inverse: [await deleteWithInverse(tx, entries, 'entries', id)] };
  },
});
