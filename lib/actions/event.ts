// Calendar (§6, stage 6, E10/E28/E48). Events are entries of kind 'event'; where they lie is in
// event_copies. Without attendees an event goes straight into the person's calendar (the worker
// writes it). With attendees it stays in Kollege until "Einladung senden" / "Änderung senden"
// (event.send: external, people only, 10 s recallable like mail, E43).
// event.cancel is external as soon as someone was invited – then only a person may (checked here).
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { isTeamAddress } from '@/lib/config';
import type { Tx } from '@/lib/db/client';
import { connections, entries, eventCopies } from '@/lib/db/schema';
import { deleteWithInverse, updateWithInverse } from './helpers';
import { ZURUECKHOLBAR_S } from './mail';
import { defineAction } from './registry';
import { ActionError, type ActionContext, type InverseOp } from './types';

const Status = z.enum(['zugesagt', 'abgesagt', 'vorbehalt', 'offen', 'nicht_eingeladen']);
const Teilnehmer = z.object({ email: z.email().transform((e) => e.toLowerCase()), name: z.string().optional(), status: Status.default('nicht_eingeladen') });

export const Versand = z.enum(['intern', 'entwurf', 'aenderung_offen', 'sendet', 'gesendet']);
export type Versand = z.infer<typeof Versand>;

export const TerminMeta = z.looseObject({
  start: z.string(),
  end: z.string(),
  all_day: z.boolean().default(false),
  location: z.string().nullable().optional(),
  organizer: z.string().nullable().optional(),
  attendees: z.array(z.string()).default([]),
  teilnahme: z.array(Teilnehmer).default([]),
  recurrence: z.string().nullable().optional(),
  status: z.string().optional(),
  versand: Versand.optional(),
  send: z.object({ art: z.enum(['einladung', 'absage']), send_after: z.string(), error: z.string().optional() }).optional(),
});
export type TerminMeta = z.infer<typeof TerminMeta>;

const userOf = (ctx: ActionContext) => {
  if (ctx.actor.type === 'system') throw new ActionError('events are made by people');
  return ctx.actor.userId;
};
const eingeladen = (m: TerminMeta) => m.teilnahme.filter((t) => t.status !== 'nicht_eingeladen');
/** someone outside the team is invited – what "external" means in §6 */
export const extern = (m: TerminMeta) => eingeladen(m).some((t) => !isTeamAddress(t.email));

async function kalenderVon(tx: Tx, userId: string, connectionId?: string) {
  const [c] = await tx
    .select()
    .from(connections)
    .where(and(eq(connections.kind, 'calendar'), eq(connections.provider, 'caldav'),
      connectionId ? eq(connections.id, connectionId) : eq(connections.user_id, userId),
      or(eq(connections.user_id, userId), isNull(connections.user_id))));
  if (!c) throw new ActionError('no calendar connected');
  const cfg = c.config as { write_calendar?: string; calendars?: string[]; address: string };
  const url = cfg.write_calendar ?? cfg.calendars?.[0];
  if (!url) throw new ActionError('no calendar to write to');
  return { conn: c, url, address: cfg.address };
}

async function loadEvent(tx: Tx, id: string) {
  const [e] = await tx.select().from(entries).where(and(eq(entries.id, id), eq(entries.kind, 'event')));
  if (!e) throw new ActionError(`event ${id} not found`);
  const [copy] = await tx.select().from(eventCopies).where(eq(eventCopies.entry_id, id));
  return { e, m: TerminMeta.parse(e.meta), copy };
}

const Zeit = z.object({
  title: z.string().trim().min(1),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  all_day: z.boolean().default(false),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const eventCreate = defineAction({
  type: 'event.create',
  schema: Zeit.extend({
    teilnahme: z.array(Teilnehmer).default([]),
    /** default: the person's own calendar */
    connection_id: z.uuid().optional(),
  }).refine((p) => new Date(p.end) >= new Date(p.start), { message: 'end before start' }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, p, ctx) {
    const me = userOf(ctx);
    const { conn, url, address } = await kalenderVon(tx, me, p.connection_id);
    // new attendees are not invited yet (E48)
    const teilnahme = p.teilnahme.map((t) => ({ ...t, status: 'nicht_eingeladen' as const }));
    const uid = `${randomUUID()}@kollege`;
    const meta: TerminMeta = {
      start: new Date(p.start).toISOString(), end: new Date(p.end).toISOString(), all_day: p.all_day, location: p.location ?? null,
      organizer: address, attendees: [], teilnahme, recurrence: null, status: 'CONFIRMED',
      versand: teilnahme.length ? 'entwurf' : 'intern',
    };
    const [e] = await tx
      .insert(entries)
      .values({
        kind: 'event', dedupe_key: uid, external_id: uid, connection_id: conn.id, occurred_at: new Date(p.start),
        author_user_id: me, title: p.title, body_text: p.notes ?? null, meta,
        visibility: conn.user_id ? 'restricted' : 'team', visible_to: conn.user_id ? [conn.user_id] : [],
        // through the intake: people and matters by the attendees, like an event from the calendar
        processing_state: 'pending',
      })
      .returning({ id: entries.id });
    // E10: with attendees it enters the calendar only when the invitation goes out
    const [c] = await tx
      .insert(eventCopies)
      .values({ entry_id: e!.id, connection_id: conn.id, calendar_url: url, href: `${url}${encodeURIComponent(uid)}.ics`, pending: !teilnahme.length })
      .returning({ id: eventCopies.id });
    // undo: if the worker wrote it meanwhile, it must go from the calendar as well
    const inverse: InverseOp[] = [
      { op: 'update', table: 'event_copies', id: c!.id, set: { loeschen: true, pending: true } },
      { op: 'update', table: 'entries', id: e!.id, set: { meta: { ...meta, status: 'CANCELLED', versand: 'intern' } } },
    ];
    return { result: { id: e!.id }, inverse };
  },
});

export const eventUpdate = defineAction({
  type: 'event.update',
  schema: Zeit.partial().extend({ id: z.uuid(), teilnahme: z.array(Teilnehmer).optional() }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id, title, notes, teilnahme, ...p }, ctx) {
    userOf(ctx);
    const { e, m, copy } = await loadEvent(tx, id);
    if (!copy) throw new ActionError('event of someone else – read only');
    if (m.versand === 'sendet') throw new ActionError('being sent');
    // people added now are not invited; known ones keep their answer
    const alt = new Map(m.teilnahme.map((t) => [t.email, t]));
    const neuT = teilnahme?.map((t) => alt.get(t.email) ?? { ...t, status: 'nicht_eingeladen' as const }) ?? m.teilnahme;
    const next: TerminMeta = {
      ...m,
      ...(p.start ? { start: new Date(p.start).toISOString() } : {}),
      ...(p.end ? { end: new Date(p.end).toISOString() } : {}),
      ...(p.all_day !== undefined ? { all_day: p.all_day } : {}),
      ...(p.location !== undefined ? { location: p.location } : {}),
      teilnahme: neuT,
    };
    if (new Date(next.end) < new Date(next.start)) throw new ActionError('end before start');
    // with invited people every change waits for "Änderung senden" (E48); a draft stays a draft
    next.versand = eingeladen(m).length ? 'aenderung_offen' : neuT.length ? 'entwurf' : 'intern';
    const set: Record<string, unknown> = { meta: next, occurred_at: new Date(next.start) };
    if (title !== undefined) set.title = title;
    if (notes !== undefined) set.body_text = notes;
    const inverse: InverseOp[] = [await updateWithInverse(tx, entries, 'entries', id, set)];
    if (next.versand === 'intern') {
      inverse.push(await updateWithInverse(tx, eventCopies, 'event_copies', copy.id, { pending: true }));
      // undo writes the old state back as well
      inverse[1] = { op: 'update', table: 'event_copies', id: copy.id, set: { pending: true } };
    }
    return { result: { id: e.id, versand: next.versand }, inverse };
  },
});

/** "Einladung senden" / "Änderung senden": out after 10 s unless recalled (lib/kalender/senden.ts) */
export const eventSend = defineAction({
  type: 'event.send',
  schema: z.object({ id: z.uuid() }),
  external: true,
  allowedActors: ['user'],
  async apply(tx, { id }, ctx) {
    userOf(ctx);
    const { m, copy } = await loadEvent(tx, id);
    if (!copy) throw new ActionError('event of someone else – read only');
    if (m.versand !== 'entwurf' && m.versand !== 'aenderung_offen') throw new ActionError('nothing to send');
    if (!m.teilnahme.length) throw new ActionError('no attendees');
    if (new Date(m.end) < new Date()) throw new ActionError('only coming events can be sent');
    const next = { ...m, versand: 'sendet' as const, send: { art: 'einladung' as const, send_after: new Date(Date.now() + ZURUECKHOLBAR_S * 1000).toISOString() } };
    return { result: { id, art: 'einladung' }, inverse: [await updateWithInverse(tx, entries, 'entries', id, { meta: next })] };
  },
});

/** cancel a coming event; a draft never sent is simply discarded (E48), also after its date */
export const eventCancel = defineAction({
  type: 'event.cancel',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id }, ctx): Promise<{ result: { id: string; verworfen?: boolean; art?: string }; inverse: InverseOp[] }> {
    userOf(ctx);
    const { e, m, copy } = await loadEvent(tx, id);
    if (!copy) throw new ActionError('event of someone else – read only');
    if (m.versand === 'sendet') throw new ActionError('being sent');
    if (m.versand === 'entwurf' && !eingeladen(m).length && !copy.etag) {
      // never sent: discarded (E48); undo brings back the event and its place in the calendar
      const kopie = await deleteWithInverse(tx, eventCopies, 'event_copies', copy.id);
      const termin = await deleteWithInverse(tx, entries, 'entries', id);
      return { result: { id, verworfen: true }, inverse: [termin, kopie] };
    }
    // a draft is discarded any time; cancelling is only for what is still to come
    if (new Date(m.end) < new Date()) throw new ActionError('only coming events can be cancelled');
    if (eingeladen(m).length) {
      // the hard rule for a cancellation that goes out: never the model (CLAUDE.md)
      if (ctx.actor.type === 'model') throw new ActionError('actor model may not run external action event.cancel');
      const next = { ...m, versand: 'sendet' as const, send: { art: 'absage' as const, send_after: new Date(Date.now() + ZURUECKHOLBAR_S * 1000).toISOString() } };
      return { result: { id, art: 'absage' }, inverse: [await updateWithInverse(tx, entries, 'entries', id, { meta: next })] };
    }
    const inverse: InverseOp[] = [
      await updateWithInverse(tx, entries, 'entries', e.id, { meta: { ...m, status: 'CANCELLED' } }),
      await updateWithInverse(tx, eventCopies, 'event_copies', copy.id, { loeschen: true, pending: true }),
    ];
    // undo: the event goes back into the calendar
    inverse[1] = { op: 'update', table: 'event_copies', id: copy.id, set: { loeschen: false, pending: true } };
    return { result: { id }, inverse };
  },
});
