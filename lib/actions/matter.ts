import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { areas, matters } from '@/lib/db/schema';
import { ALL_ACTORS, reviewStateFor } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

export const matterCreate = defineAction({
  type: 'matter.create',
  schema: z.object({
    area_key: z.string(),
    title: z.string().min(1),
    owner_user_id: z.uuid().optional(),
    phase: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).default({}),
    org_id: z.uuid().optional(),
    parent_id: z.uuid().optional(),
    predecessor_id: z.uuid().optional(),
    date_start: z.iso.datetime({ offset: true }).optional(),
    date_end: z.iso.datetime({ offset: true }).optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { area_key, date_start, date_end, ...p }, ctx) {
    const [area] = await tx.select().from(areas).where(eq(areas.key, area_key));
    if (!area) throw new ActionError(`unknown area ${area_key}`);
    const known = new Set((area.fields as { key: string }[]).map((f) => f.key));
    const unknown = Object.keys(p.fields).filter((k) => !known.has(k));
    if (unknown.length) throw new ActionError(`area ${area_key} has no field(s) ${unknown.join(', ')}`);
    if (p.phase && !area.phases.includes(p.phase)) throw new ActionError(`area ${area_key} has no phase ${p.phase}`);
    const [row] = await tx
      .insert(matters)
      .values({
        ...p,
        area_id: area.id,
        date_start: date_start ? new Date(date_start) : undefined,
        date_end: date_end ? new Date(date_end) : undefined,
        review_state: reviewStateFor(ctx.actor),
        created_by_type: ctx.actor.type === 'user' ? 'user' : 'system',
      })
      .returning({ id: matters.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'matters', id: row!.id }] };
  },
});
