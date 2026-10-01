// Prüfen: take over or discard what the system created – one or many at once (§6).
// A discard reason is kept in actions.reason and becomes a correction example (§7.4).
import { z } from 'zod';
import { matters, orgs, people } from '@/lib/db/schema';
import { ALL_ACTORS, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import type { InverseOp } from './types';

const tables = {
  matter: { table: matters, name: 'matters' },
  person: { table: people, name: 'people' },
  org: { table: orgs, name: 'orgs' },
} as const;

const Items = z
  .array(z.object({ type: z.enum(['matter', 'person', 'org']), id: z.uuid() }))
  .min(1)
  .max(1000);

export const reviewAccept = defineAction({
  type: 'review.accept',
  schema: z.object({ items: Items }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { items }) {
    const inverse: InverseOp[] = [];
    for (const it of items) {
      const t = tables[it.type];
      inverse.push(await updateWithInverse(tx, t.table, t.name, it.id, { review_state: 'accepted', discard_reason: null }));
    }
    return { result: { count: items.length }, inverse };
  },
});

export const reviewDiscard = defineAction({
  type: 'review.discard',
  schema: z.object({ items: Items, reason: z.string().trim().min(1).optional() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { items, reason }) {
    const inverse: InverseOp[] = [];
    for (const it of items) {
      const t = tables[it.type];
      inverse.push(
        await updateWithInverse(tx, t.table, t.name, it.id, { review_state: 'discarded', discard_reason: reason ?? null }),
      );
    }
    return { result: { count: items.length }, inverse };
  },
});

