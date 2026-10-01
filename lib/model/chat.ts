// Chat (§9.1): one answer of role "think" with reading and acting tools, streamed as UI
// message chunks. Messages are stored through the action layer (chat.append); the answer is
// stored even if the browser disconnects (the stream is drained on the server as well).
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { convertToModelMessages, isStepCount, streamText, toUIMessageStream, type LanguageModel, type UIMessage } from 'ai';
import { runAction } from '@/lib/actions';
import { withUser } from '@/lib/db/client';
import { denkweisePrompt, kontext, type ChatBezug } from './kontext';
import { getModel, logCall, modelName } from './models';
import { handelnwerkzeuge } from './werkzeuge/handeln';
import { lesewerkzeuge } from './werkzeuge/lesen';

export interface ChatInfo {
  id: string;
  title: string | null;
  bezug: ChatBezug | null;
  messages: UIMessage[];
}

export async function ladeChat(userId: string, chatId: string): Promise<ChatInfo | null> {
  return withUser(userId, async (tx) => {
    const c = (await tx.execute<{ id: string; title: string | null; context_type: string | null; context_id: string | null }>(sql`
      SELECT id, title, context_type, context_id FROM chats WHERE id = ${chatId}`)).rows[0];
    if (!c) return null;
    const m = await tx.execute<{ content: UIMessage }>(sql`
      SELECT content FROM chat_messages WHERE chat_id = ${chatId} ORDER BY created_at, id`);
    return {
      id: c.id,
      title: c.title,
      bezug: c.context_type && c.context_id ? { type: c.context_type as ChatBezug['type'], id: c.context_id } : null,
      messages: m.rows.map((r) => r.content),
    };
  });
}

async function drain(stream: ReadableStream<unknown>) {
  const reader = stream.getReader();
  while (!(await reader.read()).done) { /* keep pulling */ }
}

export interface AntwortOptionen {
  userId: string;
  chatId: string;
  /** the new user message */
  message: UIMessage;
  now?: Date;
  /** test seam; default getModel('think') */
  model?: LanguageModel;
  abortSignal?: AbortSignal;
}

/** stream for the browser; `fertig` resolves when the answer is stored */
export async function chatAntwort(o: AntwortOptionen): Promise<{ stream: ReadableStream; fertig: Promise<void> }> {
  const now = o.now ?? new Date();
  const chat = await ladeChat(o.userId, o.chatId);
  if (!chat) throw new Error('chat not found');
  if (o.message.role !== 'user') throw new Error('expected a user message');
  const text = o.message.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n').trim();
  if (!text) throw new Error('empty message');
  // only text from the browser – tool parts are made on the server
  const message: UIMessage = { id: o.message.id || randomUUID(), role: 'user', metadata: { at: new Date().toISOString() }, parts: [{ type: 'text', text }] };
  await runAction({ type: 'user', userId: o.userId }, 'chat.append', { chat_id: chat.id, role: 'user', content: message });

  const k = { userId: o.userId, now, chatId: chat.id };
  const tools = { ...lesewerkzeuge(k), ...handelnwerkzeuge(k) };
  const ctx = await kontext(o.userId, now, chat.bezug);
  const messages = [...chat.messages, message];
  const model = o.model ?? getModel('think');
  const log = { userId: o.userId, role: 'think' as const, model: modelName(model), purpose: 'chat' };
  const started = Date.now();

  const result = streamText({
    model,
    instructions: `${denkweisePrompt()}\n\n${ctx.text}`,
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(12),
    abortSignal: o.abortSignal,
    onEnd: async (r) => {
      await logCall({ ...log, durationMs: Date.now() - started, inputTokens: r.totalUsage.inputTokens, outputTokens: r.totalUsage.outputTokens });
    },
    onError: async ({ error }) => {
      console.error('[chat]', error);
      await logCall({ ...log, durationMs: Date.now() - started, error: String(error) });
    },
  });

  const ui = toUIMessageStream({
    stream: result.stream,
    tools,
    originalMessages: messages,
    generateMessageId: randomUUID,
    // when the answer started (the log column of the chat)
    messageMetadata: ({ part }) => (part.type === 'start' ? { at: new Date().toISOString() } : undefined),
    onError: () => 'Das ging nicht – technischer Fehler beim Modell.',
    onEnd: async ({ responseMessage }) => {
      if (!responseMessage.parts.length) return;
      await runAction({ type: 'model', userId: o.userId }, 'chat.append', { chat_id: chat.id, role: 'assistant', content: responseMessage });
    },
  });
  const [forClient, forServer] = ui.tee();
  const fertig = drain(forServer).catch((e) => console.error('[chat] save', e));
  return { stream: forClient, fertig };
}
