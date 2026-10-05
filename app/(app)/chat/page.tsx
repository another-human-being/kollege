// Neuer Chat (§11, E62): the input field, below it the person's chats (search, pinned, recent).
// The first message creates the chat. Chats are not in the sidebar (E40, E51).
import { currentUserId } from '@/auth';
import { ChatListe, EingabeStart } from '@/components/chat';
import { chatListe } from '@/lib/views/chats';

export const dynamic = 'force-dynamic';

export default async function NeuerChat() {
  const chats = await chatListe(await currentUserId());
  return (
    <main className="spalte">
      <h1 className="kg-sr">Neuer Chat</h1>
      <EingabeStart />
      <p className="mono" style={{ color: 'var(--ink-muted)', marginTop: 'calc(var(--space-4) - 44px)' }}>
        Erzähl, was passiert ist, frag etwas oder gib eine Anweisung („Ab jetzt …“). Was im Bestand landet, zeigt eine Karte mit Rückgängig.
      </p>
      <ChatListe chats={chats} now={new Date().toISOString()} />
    </main>
  );
}
