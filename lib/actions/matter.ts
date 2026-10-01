import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { areas, matters } from '@/lib/db/schema';
import type { Tx } from '@/lib/db/client';
import { ALL_ACTORS, defined, reviewStateFor, updateWithInverse } from './helpers';
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

const isoOrNull = z.iso.datetime({ offset: true }).nullable().optional();
const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));

async function areaOf(tx: Tx, matterId: string) {
  const [row] = await tx
    .select({ area: areas })
    .from(matters)
    .innerJoin(areas, eq(areas.id, matters.area_id))
    .where(eq(matters.id, matterId));
  if (!row) throw new ActionError(`matter ${matterId} not found`);
  return row.area;
}

export const matterUpdate = defineAction({
  type: 'matter.update',
  schema: z.object({
    id: z.uuid(),
    title: z.string().min(1).optional(),
    /** partial: given keys are set, null removes a value */
    fields: z.record(z.string(), z.unknown()).optional(),
    phase: z.string().nullable().optional(),
    date_start: isoOrNull,
    date_end: isoOrNull,
    org_id: z.uuid().nullable().optional(),
    parent_id: z.uuid().nullable().optional(),
    predecessor_id: z.uuid().nullable().optional(),
    outcome_note: z.string().nullable().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, fields, date_start, date_end, ...p }) {
    const area = await areaOf(tx, id);
    const set: Record<string, unknown> = defined({ ...p, date_start: toDate(date_start), date_end: toDate(date_end) });
    if (p.phase && !area.phases.includes(p.phase)) throw new ActionError(`area ${area.key} has no phase ${p.phase}`);
    if (fields) {
      const known = new Set((area.fields as { key: string }[]).map((f) => f.key));
      const unknown = Object.keys(fields).filter((k) => !known.has(k));
      if (unknown.length) throw new ActionError(`area ${area.key} has no field(s) ${unknown.join(', ')}`);
      const [m] = await tx.select({ fields: matters.fields }).from(matters).where(eq(matters.id, id));
      const merged: Record<string, unknown> = { ...(m!.fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(fields)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
      }
      set.fields = merged;
    }
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    const inverse = await updateWithInverse(tx, matters, 'matters', id, set);
    return { result: { id }, inverse: [inverse] };
  },
});

export const matterSetStatus = defineAction({
  type: 'matter.set_status',
  schema: z.object({ id: z.uuid(), status: z.enum(['open', 'done']) }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, status }) {
    return { result: { id }, inverse: [await updateWithInverse(tx, matters, 'matters', id, { status })] };
  },
});

export const matterAssign = defineAction({
  type: 'matter.assign',
  schema: z.object({ id: z.uuid(), owner_user_id: z.uuid().nullable() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, owner_user_id }) {
    // responsibility is not a free field (E45): directly assignable only while nobody is responsible
    const [m] = await tx.select({ owner: matters.owner_user_id }).from(matters).where(eq(matters.id, id));
    if (!m) throw new ActionError(`matter ${id} not found`);
    if (m.owner !== null) throw new ActionError('someone is responsible already – hand over instead');
    return { result: { id }, inverse: [await updateWithInverse(tx, matters, 'matters', id, { owner_user_id })] };
  },
});

/** "Übergeben an" (E45): stays with the current owner until the recipient accepts. */
export const matterHandover = defineAction({
  type: 'matter.handover',
  schema: z.object({ id: z.uuid(), to_user_id: z.uuid() }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id, to_user_id }, ctx) {
    const [m] = await tx.select().from(matters).where(eq(matters.id, id));
    if (!m) throw new ActionError(`matter ${id} not found`);
    const me = ctx.actor.type === 'system' ? null : ctx.actor.userId;
    if (m.owner_user_id !== me) throw new ActionError('only the person responsible can hand over');
    if (to_user_id === me) throw new ActionError('cannot hand over to yourself');
    return { result: { id }, inverse: [await updateWithInverse(tx, matters, 'matters', id, { handover_to: to_user_id })] };
  },
});

export const matterHandoverAccept = defineAction({
  type: 'matter.handover_accept',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ['user'],
  async apply(tx, { id }, ctx) {
    const [m] = await tx.select().from(matters).where(eq(matters.id, id));
    const me = ctx.actor.type === 'user' ? ctx.actor.userId : null;
    if (!m || m.handover_to !== me) throw new ActionError('no handover to you pending');
    return {
      result: { id },
      inverse: [await updateWithInverse(tx, matters, 'matters', id, { owner_user_id: me, handover_to: null })],
    };
  },
});

/** withdrawn by the person handing over, or declined by the recipient */
export const matterHandoverWithdraw = defineAction({
  type: 'matter.handover_withdraw',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ['user'],
  async apply(tx, { id }, ctx) {
    const [m] = await tx.select().from(matters).where(eq(matters.id, id));
    const me = ctx.actor.type === 'user' ? ctx.actor.userId : null;
    if (!m || m.handover_to === null) throw new ActionError('no handover pending');
    if (me !== m.owner_user_id && me !== m.handover_to) throw new ActionError('not your handover');
    return { result: { id }, inverse: [await updateWithInverse(tx, matters, 'matters', id, { handover_to: null })] };
  },
});

/** "Aus Vorjahr": new matter in the same area and org, pointing to its predecessor, with the carry_over fields. */
export const matterCreateFromPrevious = defineAction({
  type: 'matter.create_from_previous',
  schema: z.object({ previous_id: z.uuid(), title: z.string().min(1) }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { previous_id, title }, ctx) {
    const area = await areaOf(tx, previous_id);
    if (!(area.actions as string[]).includes('from_previous')) {
      throw new ActionError(`area ${area.key} does not offer "from previous"`);
    }
    const [prev] = await tx.select().from(matters).where(eq(matters.id, previous_id));
    // only fields marked carry_over (events: place and seats – not date or registrations)
    const carry = new Set((area.fields as { key: string; carry_over?: boolean }[]).filter((f) => f.carry_over).map((f) => f.key));
    const fields = Object.fromEntries(Object.entries(prev!.fields as Record<string, unknown>).filter(([k]) => carry.has(k)));
    const [row] = await tx
      .insert(matters)
      .values({
        area_id: area.id,
        title,
        org_id: prev!.org_id,
        fields,
        predecessor_id: previous_id,
        owner_user_id: ctx.actor.type === 'system' ? prev!.owner_user_id : ctx.actor.userId,
        review_state: reviewStateFor(ctx.actor),
        created_by_type: ctx.actor.type === 'user' ? 'user' : 'system',
      })
      .returning({ id: matters.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'matters', id: row!.id }] };
  },
});
