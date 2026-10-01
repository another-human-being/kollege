// Neuer Chat (§11): only the input field; the first message creates the chat.
import { EingabeStart } from '@/components/chat';

export default function NeuerChat() {
  return (
    <main className="spalte">
      <h1 className="kg-sr">Neuer Chat</h1>
      <EingabeStart />
      <p className="mono" style={{ color: 'var(--ink-muted)' }}>
        Erzähl, was passiert ist, frag etwas oder gib eine Anweisung („Ab jetzt …“). Was im Bestand landet, zeigt eine Karte mit Rückgängig.
      </p>
    </main>
  );
}
