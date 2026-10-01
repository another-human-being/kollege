// Notes and conversations: entries of kind 'note', linked to what they are about.
// A conversation (E50) is a note with date, kind and participants in meta.
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { entries, links } from '@/lib/db/schema';
import { ALL_ACTORS, defined, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

const Conversation = z.object({
  art: z.enum(['Beratung', 'Telefonat', 'Treffen', 'Mail', 'Sonstiges']),
  mit: z.string().trim().max(300).default(''),
});

export const noteCreate = defineAction({
  type: 'note.create',
  schema: z.object({
    target_type: z.enum(['matter', 'person', 'org']),
    target_id: z.uuid(),
    body_text: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    /** when it happened (conversations); default now */
    occurred_at: z.iso.datetime({ offset: true }).optional(),
    conversation: Conversation.optional(),
    /** only for the author (Privat) */
    private: z.boolean().default(false),
  }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, p, ctx) {
    if (ctx.actor.type === 'system') throw new ActionError('notes are written by people');
    const me = ctx.actor.userId;
    const [e] = await tx
      .insert(entries)
      .values({
        kind: 'note',
        dedupe_key: `note:${randomUUID()}`,
        occurred_at: p.occurred_at ? new Date(p.occurred_at) : new Date(),
        author_user_id: me,
        title: p.title ?? (p.conversation ? p.conversation.art : null),
        body_text: p.body_text,
        meta: p.conversation ? { conversation: p.conversation } : {},
        visibility: p.private ? 'restricted' : 'team',
        visible_to: p.private ? [me] : [],
        processing_state: 'done',
      })
      .returning({ id: entries.id });
    const [l] = await tx
      .insert(links)
      .values({ entry_id: e!.id, target_type: p.target_type, target_id: p.target_id, origin: ctx.actor.type === 'user' ? 'human' : 'model', confidence: 'high', action_id: ctx.actionId })
      .returning({ id: links.id });
    return {
      result: { id: e!.id },
      // the link first: it references the entry
      inverse: [
        { op: 'delete', table: 'links', id: l!.id },
        { op: 'delete', table: 'entries', id: e!.id },
      ],
    };
  },
});

export const noteUpdate = defineAction({
  type: 'note.update',
  schema: z.object({ id: z.uuid(), body_text: z.string().trim().min(1).optional(), title: z.string().trim().nullable().optional() }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id, ...p }) {
    const [e] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.id, id), eq(entries.kind, 'note')));
    if (!e) throw new ActionError(`note ${id} not found`);
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, entries, 'entries', id, set)] };
  },
});

