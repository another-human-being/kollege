import { z } from 'zod';
import { hints } from '@/lib/db/schema';
import { ALL_ACTORS, updateWithInverse } from './helpers';
import { defineAction, getAction } from './registry';
import { ActionError } from './types';

export const HintOption = z.object({
  label: z.string().min(1),
  action_type: z.string().refine((t) => getAction(t) !== undefined, 'unknown action type'),
  payload: z.record(z.string(), z.unknown()),
});
export type HintOption = z.infer<typeof HintOption>;

export const hintCreate = defineAction({
  type: 'hint.create',
  schema: z.object({
    /** optional so that options can refer to their own hint (e.g. hint.dismiss) */
    id: z.uuid().optional(),
    user_id: z.uuid().optional(),
    kind: z.enum(['clarify', 'overdue', 'waiting', 'stale', 'after_event', 'outcome', 'handover', 'review_batch', 'advice']),
    text: z.string().min(1),
    reason: z.string().optional(),
    area_id: z.uuid().optional(),
    target_type: z.enum(['matter', 'person', 'org', 'entry', 'task']).optional(),
    target_id: z.uuid().optional(),
    options: z.array(HintOption).max(3).default([]),
    show_from: z.iso.datetime({ offset: true }).optional(),
    dedupe_key: z.string().min(1),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { show_from, ...p }) {
    const [row] = await tx
      .insert(hints)
      .values({ ...p, show_from: show_from ? new Date(show_from) : undefined })
      .returning({ id: hints.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'hints', id: row!.id }] };
  },
});

export const hintDismiss = defineAction({
  type: 'hint.dismiss',
  schema: z.object({ hint_id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { hint_id }) {
    return { result: { id: hint_id }, inverse: [await updateWithInverse(tx, hints, 'hints', hint_id, { status: 'dismissed' })] };
  },
});

export const hintResolve = defineAction({
  type: 'hint.resolve',
  schema: z.object({ hint_id: z.uuid() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { hint_id }) {
    return { result: { id: hint_id }, inverse: [await updateWithInverse(tx, hints, 'hints', hint_id, { status: 'done' })] };
  },
});
