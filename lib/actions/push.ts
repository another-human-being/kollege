// Push notifications (answer of 09.10.2026): a person turns them on per device. Only the person
// themself – never the model – subscribes or removes a device. The subscription arrives here
// already encrypted (lib/push/abo.ts), so the action log never holds it in plain text.
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { hints, pushSubscriptions } from '@/lib/db/schema';
import { defineAction } from './registry';
import { ActionError } from './types';

export const pushSubscribe = defineAction({
  type: 'push.subscribe',
  schema: z.object({
    endpoint_hash: z.string().regex(/^[0-9a-f]{64}$/),
    subscription: z.string().startsWith('enc:v1:'),
    label: z.string().min(1).max(80),
  }),
  external: false,
  allowedActors: ['user'],
  async apply(tx, p, ctx) {
    if (ctx.actor.type !== 'user') throw new ActionError('only a person subscribes a device');
    const userId = ctx.actor.userId;
    // the same device again (e.g. after a new login): replace, it may belong to someone else now
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint_hash, p.endpoint_hash));
    const [row] = await tx.insert(pushSubscriptions).values({ ...p, user_id: userId }).returning({ id: pushSubscriptions.id });
    return { result: { id: row!.id }, inverse: null };
  },
});

export const pushUnsubscribe = defineAction({
  type: 'push.unsubscribe',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ['user', 'system'],
  async apply(tx, { id }) {
    // RLS: a person removes only their own devices; the system removes devices the push service no longer knows
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    return { result: { id }, inverse: null };
  },
});

/** the hint has had its chance to go out (sent, or nobody to send it to) – once per hint */
export const hintNotified = defineAction({
  type: 'hint.notified',
  schema: z.object({ hint_ids: z.array(z.uuid()).min(1) }),
  external: false,
  allowedActors: ['system'],
  async apply(tx, { hint_ids }) {
    for (const id of hint_ids) await tx.update(hints).set({ notified_at: new Date() }).where(and(eq(hints.id, id), isNull(hints.notified_at)));
    return { result: { count: hint_ids.length }, inverse: null };
  },
});
