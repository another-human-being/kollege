// Chat endpoint (§9.1): the browser sends only the new message; history, tools and rights
// come from the server. Signed-in users only; the chat must be their own (RLS). No abort on
// disconnect: started steps finish and the answer is stored (lib/model/chat.ts).
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { z } from 'zod';
import { currentUserId } from '@/auth';
import { chatAntwort } from '@/lib/model/chat';

export const maxDuration = 120;

const Body = z.object({
  id: z.uuid(),
  message: z.object({
    id: z.string().min(1),
    role: z.literal('user'),
    parts: z.array(z.object({ type: z.string() }).loose()).min(1),
  }),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await currentUserId();
  } catch {
    return new Response('nicht angemeldet', { status: 401 });
  }
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response('ungültige Anfrage', { status: 400 });
  try {
    const { stream } = await chatAntwort({ userId, chatId: body.data.id, message: body.data.message as UIMessage });
    return createUIMessageStreamResponse({ stream });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/chat not found/.test(msg)) return new Response('Chat nicht gefunden', { status: 404 });
    if (/empty message/.test(msg)) return new Response('leere Nachricht', { status: 400 });
    console.error('[api/chat]', e);
    return new Response('Fehler', { status: 500 });
  }
}
