// Instructions are entries (kind 'instruction'). Created through the chat (stage 3, §11:
// one input field); stage 2 settings can change and delete them.
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
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

/**
 * §10: which hints someone gets and how often is set by personal instructions in the chat
 * ("Social-Media-Hinweise nur montags"). The model reads the sentence once and stores it as a
 * rule; Heute applies it without a model (decision 42).
 */
export const HinweisRegel = z.object({
  arten: z.array(z.enum(['overdue', 'waiting', 'stale', 'handover', 'after_event', 'outcome', 'advice', 'clarify', 'review_batch'])).min(1).optional()
    .describe('welche Hinweise: overdue (eigene Aufgabe überfällig), waiting (wartet auf uns / Zusage anderer), stale (hängt), handover, after_event (Was kam raus?), outcome (Wie lief’s?), advice (Rat), clarify, review_batch; leer = alle'),
  bereiche: z.array(z.string()).min(1).optional().describe('Schlüssel der Bereiche (area key), leer = alle'),
  wochentage: z.array(z.number().int().min(1).max(7)).min(1).optional().describe('nur an diesen Tagen zeigen, 1 = Montag … 7 = Sonntag'),
  aus: z.boolean().optional().describe('true = diese Hinweise gar nicht zeigen'),
}).refine((r) => r.aus || r.wochentage, { message: 'aus or wochentage' });
export type HinweisRegel = z.infer<typeof HinweisRegel>;

/** does one of the person's rules hide a hint of this kind and area today? (Heute and push alike) */
export function verborgen(regeln: HinweisRegel[], art: string, areaKey: string | null, wochentag: number): boolean {
  return regeln.some((r) =>
    (!r.arten || r.arten.includes(art as never)) && (!r.bereiche || (areaKey !== null && r.bereiche.includes(areaKey)))
    && (r.aus || (r.wochentage !== undefined && !r.wochentage.includes(wochentag))));
}

/** personal (only for me) > area > team (§9.1) */
export const instructionCreate = defineAction({
  type: 'instruction.create',
  schema: z
    .object({
      body_text: z.string().trim().min(1).max(1000),
      scope: z.enum(['personal', 'area', 'team']),
      area_id: z.uuid().optional(),
      hinweise: HinweisRegel.optional().describe('nur bei persönlichen Anweisungen, die regeln, welche Hinweise wann erscheinen'),
    })
    .refine((p) => !p.hinweise || p.scope === 'personal', { message: 'hint rules are personal' })
    .refine((p) => (p.scope === 'area') === !!p.area_id, { message: 'area_id belongs to scope area (and only there)' }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, p, ctx) {
    if (ctx.actor.type === 'system') throw new ActionError('instructions come from people');
    const me = ctx.actor.userId;
    const personal = p.scope === 'personal';
    const [e] = await tx
      .insert(entries)
      .values({
        kind: 'instruction',
        dedupe_key: `instruction:${randomUUID()}`,
        occurred_at: new Date(),
        author_user_id: me,
        body_text: p.body_text,
        visibility: personal ? 'restricted' : 'team',
        visible_to: personal ? [me] : [],
        instruction_user_id: personal ? me : null,
        instruction_area_id: p.area_id ?? null,
        processing_state: 'done',
        ...(p.hinweise ? { meta: { hinweise: p.hinweise } } : {}),
      })
      .returning({ id: entries.id });
    return { result: { id: e!.id }, inverse: [{ op: 'delete', table: 'entries', id: e!.id }] };
  },
});

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
