// Chats (§4.12): personal, only for their owner (RLS). Like every data change they go
// through runAction; they are a conversation log, not part of the record, so they are
// not undoable (deleting a message would falsify the log the cards refer to).
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { chatMessages, chats } from '@/lib/db/schema';
import { defined } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

export const chatCreate = defineAction({
  type: 'chat.create',
  schema: z.object({
    title: z.string().trim().min(1).max(200),
    context_type: z.enum(['matter', 'org', 'person']).optional(),
    context_id: z.uuid().optional(),
  }),
  external: false,
  allowedActors: ['user'],
  async apply(tx, p, ctx) {
    if (ctx.actor.type !== 'user') throw new ActionError('chats belong to people');
    const [c] = await tx.insert(chats).values({ ...p, user_id: ctx.actor.userId }).returning({ id: chats.id });
    return { result: { id: c!.id }, inverse: null };
  },
});

export const chatUpdate = defineAction({
  type: 'chat.update',
  schema: z.object({ id: z.uuid(), title: z.string().trim().min(1).max(200).optional(), pinned: z.boolean().optional() }),
  external: false,
  allowedActors: ['user'],
  async apply(tx, { id, ...p }) {
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    const changed = await tx.update(chats).set(set).where(eq(chats.id, id)).returning({ id: chats.id });
    if (changed.length !== 1) throw new ActionError(`chat ${id} not found or not allowed`);
    return { result: { id }, inverse: null };
  },
});

/** one message (a UI message as the chat shows it: id, role, parts) */
export const chatAppend = defineAction({
  type: 'chat.append',
  schema: z.object({
    chat_id: z.uuid(),
    role: z.enum(['user', 'assistant']),
    content: z.looseObject({ id: z.string().min(1), parts: z.array(z.unknown()) }),
  }),
  // the assistant's answer is written by the app on behalf of the user, as actor model
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, p, ctx) {
    if (ctx.actor.type === 'system') throw new ActionError('chats belong to people');
    if ((p.role === 'user') !== (ctx.actor.type === 'user')) throw new ActionError('user messages come from the user, answers from the model');
    // RLS: inserting into someone else's chat fails the policy (chat not visible)
    const [m] = await tx.insert(chatMessages).values(p).returning({ id: chatMessages.id });
    await tx.update(chats).set({ updated_at: sql`now()` }).where(eq(chats.id, p.chat_id));
    return { result: { id: m!.id }, inverse: null };
  },
});
