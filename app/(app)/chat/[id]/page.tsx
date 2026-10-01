// A chat (§9.1, E35): log of messages, cards with undo, the input below.
import { notFound } from 'next/navigation';
import type { UIMessage } from 'ai';
import { currentUserId } from '@/auth';
import { ChatAnsicht } from '@/components/chat';
import { ladeChat } from '@/lib/model/chat';
import { withUser } from '@/lib/db/client';
import { bezugName } from '@/lib/model/kontext';
import { kartenStand } from '@/lib/views/chats';

export const dynamic = 'force-dynamic';

const actionIds = (messages: UIMessage[]) =>
  messages.flatMap((m) => m.parts)
    .map((p) => (p as { output?: { karte?: { actionId?: string } } }).output?.karte?.actionId)
    .filter((id): id is string => !!id);

export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const chat = await ladeChat(userId, id);
  if (!chat) notFound();
  const stand = await kartenStand(userId, actionIds(chat.messages));
  const b = chat.bezug ? await withUser(userId, (tx) => bezugName(tx, chat.bezug!)) : null;
  const seite = b ? `${b.art} · ${b.name}` : undefined;
  return (
    <main className="spalte spalte--chat">
      <h1 className="kg-sr">{chat.title ?? 'Chat'}</h1>
      <ChatAnsicht chatId={chat.id} start={chat.messages} stand={stand} kontext={seite}
        platzhalter={seite ? 'Frag oder notiere etwas dazu' : undefined} />
    </main>
  );
}
