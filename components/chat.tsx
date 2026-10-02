'use client';
// Eingabe & Chat (§11, design: Eingabe, Nachricht, Karte, ChatListe). One input field
// everywhere; it opens a conversation. Deviations from the bundle (STAND.md, Befunde Stufe 3):
// - Karte shows "Rückgängig gemacht" only after the undo succeeded (the bundle switches first)
// - no "Wiederholen" on cards: a redo would be a new action the stored card cannot follow
// - Eingabe: the button is the arrow "Abschicken" (the README also mentions "Merken")
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chatAnlegen, mailSenden, perform, undo } from '@/app/actions';
import { Aktion, Aussage, Etikett, Laden, Privat, Quelle } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';
import type { Karte } from '@/lib/model/werkzeuge/karten';
import type { Quelle as QuelleT } from '@/lib/model/werkzeuge/quellen';
import { zeitpunkt } from '@/lib/format';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const ausstehend = (chatId: string) => `kollege:frage:${chatId}`;

export function Eingabe({
  onSenden, kontext, platzhalter, verarbeitet, id = 'kg-eingabe', autoFocus,
}: { onSenden: (text: string) => void | Promise<void>; kontext?: ReactNode; platzhalter?: string; verarbeitet?: boolean; id?: string; autoFocus?: boolean }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const zustand = verarbeitet ? 'verarbeitet' : text.trim() ? 'bereit' : 'leer';
  useEffect(() => {
    const t = ref.current;
    if (t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }
  }, [text]);
  function senden() {
    const t = text.trim();
    if (!t || verarbeitet) return;
    setText('');
    void onSenden(t);
  }
  return (
    <div className="kg-eingabe" data-zustand={zustand}>
      {kontext ? <div className="kg-eingabe-kontext"><span>Kontext</span>{kontext}</div> : null}
      <label className="kg-sr" htmlFor={id}>Was ist passiert oder soll passieren?</label>
      <textarea id={id} ref={ref} rows={2} value={text} readOnly={verarbeitet} autoFocus={autoFocus}
        placeholder={platzhalter ?? 'Was ist passiert? Frag oder notiere etwas – in eigenen Worten.'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); senden(); } }} />
      <div className="kg-eingabe-fuss">
        <span className="kg-eingabe-hilfe">
          {verarbeitet ? <Laden inline text="Lese mit, ordne zu" /> : '⏎ abschicken · ⇧⏎ neue Zeile · Frage oder Notiz'}
        </span>
        <Aktion variante="primaer" onClick={senden} disabled={zustand !== 'bereit'} aria-label="Abschicken">→</Aktion>
      </div>
    </div>
  );
}

/** input outside a chat (Heute, detail pages): creates the chat and opens it */
export function EingabeStart({ bezug, kontext, platzhalter }: { bezug?: { type: 'matter' | 'org' | 'person'; id: string }; kontext?: string; platzhalter?: string }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  async function start(text: string) {
    setLaeuft(true);
    const r = await chatAnlegen(text, bezug);
    if (!r.ok) { setFehler(r.error); setLaeuft(false); return; }
    const id = (r.result as { id: string }).id;
    try { sessionStorage.setItem(ausstehend(id), text); } catch { /* storage blocked: the chat opens empty */ }
    router.push(`/chat/${id}`);
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Eingabe onSenden={start} verarbeitet={laeuft} kontext={kontext} platzhalter={platzhalter} />
      {fehler ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>{fehler}</div> : null}
    </div>
  );
}

// --- messages ---------------------------------------------------------------------------

type ToolPart = { type: string; state: string; output?: { karte?: Karte; quellen?: QuelleT[] } };
const toolTeile = (m: UIMessage) => m.parts.filter((p) => p.type.startsWith('tool-')) as unknown as ToolPart[];

/** text with citations [[id]] → Quelle; only ids a tool of this answer returned are shown */
function Text({ text, quellen }: { text: string; quellen: Map<string, QuelleT> }) {
  const zeilen = text.split('\n');
  const inline = (z: string) =>
    z.split(/(\[\[[0-9a-f-]{36}\]\])/g).map((t, i) => {
      const id = /^\[\[([0-9a-f-]{36})\]\]$/.exec(t)?.[1];
      if (!id) return t;
      const q = quellen.get(id);
      return q ? <span key={i}> <Quelle href={q.href ?? undefined}>{q.label}</Quelle></span> : null;
    });
  return (
    <>
      {zeilen.map((z, i) => {
        const v = /^\s*Vermutung:\s*(.*)$/.exec(z);
        if (v) return <Aussage key={i} art="einschaetzung">{inline(v[1]!)}</Aussage>;
        return <span key={i}>{inline(z)}{i < zeilen.length - 1 ? '\n' : null}</span>;
      })}
    </>
  );
}

function KarteAnsicht({ k, stand }: { k: Karte; stand?: { undone: boolean; folgen?: string } }) {
  const [zurueck, setZurueck] = useState(stand?.undone ?? false);
  const [fehler, setFehler] = useState<string | null>(null);
  const titel = k.art === 'anweisung' ? 'Anweisung gespeichert' : 'Erledigt';
  const folgen = stand ? stand.folgen : k.folgen;
  async function rueckgaengig() {
    const r = await undo(k.actionId);
    if (r.ok) setZurueck(true);
    else setFehler(r.error);
  }
  return (
    <div className={cx('kg-karte', zurueck && 'kg-karte--zurueck')} role="group" aria-label={titel}>
      <div className="kg-karte-kopf">
        <span className="kg-karte-titel">{titel}</span>
        {k.geltung ? <Etikett>{k.geltung === 'team' ? 'Team' : 'Persönlich'}</Etikett> : null}
        {k.privat ? <Privat /> : null}
      </div>
      <ul className="kg-karte-punkte">{k.punkte.map((p, i) => <li key={i}>{p}</li>)}</ul>
      {k.anweisung ? <div className="kg-karte-anweisung">nach Anweisung: „{k.anweisung}“</div> : null}
      {k.entwurf && !zurueck ? <EntwurfBlock e={k.entwurf} /> : null}
      <div className="kg-karte-fuss">
        {k.link ? <a className="kg-bezug" href={k.link.href}>{k.link.text}</a> : null}
        {zurueck ? (
          <span className="kg-karte-status">Rückgängig gemacht</span>
        ) : k.undoable ? (
          <span className="kg-karte-rueck">
            <Aktion variante="rueckgaengig" onClick={rueckgaengig} />
            {folgen ? <span className="kg-karte-folgen">{folgen}</span> : null}
          </span>
        ) : null}
        {fehler ? <span role="alert" className="kg-karte-folgen">{fehler}</span> : null}
      </div>
    </div>
  );
}

/** design: Entwurf – leaves the organisation only by the person's click (E6, E43) */
function EntwurfBlock({ e }: { e: NonNullable<Karte['entwurf']> }) {
  const { show } = useAktion();
  const [gesendet, setGesendet] = useState(false);
  return (
    <div className="kg-entwurf">
      <div className="mono">Mail an {e.an}</div>
      <div><strong>{e.betreff || '(ohne Betreff)'}</strong></div>
      <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>{e.auszug}</div>
      <div className="kg-aktionen">
        <a className="kg-aktion kg-aktion--sekundaer" href={`/mail?entwurf=${e.id}`}>Ansehen</a>
        <Aktion variante="primaer" disabled={gesendet} onClick={async () => {
          const r = await mailSenden(e.id);
          if (r.ok) setGesendet(true);
          show(r, `Wird gesendet an ${e.an} – 10 s zurückholbar`, () => mailSenden(e.id), { ms: 10_000, nachher: () => setGesendet(false) });
        }}>Über mein Postfach senden</Aktion>
      </div>
      <div className="mono" style={{ color: 'var(--ink-muted)' }}>geht über dein Postfach und liegt danach im Gesendet-Ordner</div>
    </div>
  );
}

function Nachricht({ m, streamt, stand, now }: { m: UIMessage; streamt: boolean; stand: Record<string, { undone: boolean; folgen?: string }>; now: Date }) {
  const du = m.role === 'user';
  const at = (m.metadata as { at?: string } | undefined)?.at;
  const teile = toolTeile(m);
  const quellen = new Map(teile.flatMap((p) => p.output?.quellen ?? []).map((q) => [q.id, q]));
  const text = m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
  const karten = teile.map((p) => p.output?.karte).filter((k): k is Karte => !!k);
  const arbeitet = streamt && teile.some((p) => p.state === 'input-streaming' || p.state === 'input-available');
  return (
    <>
      <div className={cx('kg-nachricht', du ? 'kg-nachricht--du' : 'kg-nachricht--kollege')}>
        <div className="kg-nachricht-wer"><span>{du ? 'Du' : 'Kollege'}</span>{at ? <span>{zeitpunkt(at, now)}</span> : null}</div>
        <div className="kg-nachricht-text">
          {text ? <Text text={text} quellen={quellen} /> : null}
          {arbeitet ? <Laden inline text="Lese mit, ordne zu" /> : null}
          {streamt && !arbeitet ? <span className="kg-caret" aria-hidden="true" /> : null}
        </div>
      </div>
      {karten.length ? (
        <div className="chat-karten">
          {karten.map((k) => <KarteAnsicht key={`${k.actionId}:${stand[k.actionId]?.undone ?? ''}`} k={k} stand={stand[k.actionId]} />)}
        </div>
      ) : null}
    </>
  );
}

export function ChatAnsicht({
  chatId, start, stand, kontext, platzhalter,
}: { chatId: string; start: UIMessage[]; stand: Record<string, { undone: boolean; folgen?: string }>; kontext?: string; platzhalter?: string }) {
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages.at(-1) } }),
  }), []);
  const { messages, sendMessage, status, error } = useChat({ id: chatId, messages: start, transport });
  const ende = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const now = new Date();

  // first input from Heute or a detail page. Sent from a timer that the cleanup cancels:
  // React (dev, strict mode) runs effects twice and aborts what the first run started.
  useEffect(() => {
    if (start.length) return;
    const t = setTimeout(() => {
      let text: string | null = null;
      try { text = sessionStorage.getItem(ausstehend(chatId)); sessionStorage.removeItem(ausstehend(chatId)); } catch { /* no storage */ }
      if (text) void sendMessage({ text });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  useEffect(() => { ende.current?.scrollIntoView({ block: 'end' }); }, [messages]);
  // new chat title and changed record: refresh the server parts (sidebar) once an answer is done
  const vorher = useRef(status);
  useEffect(() => {
    if (vorher.current !== 'ready' && status === 'ready') router.refresh();
    vorher.current = status;
  }, [status, router]);

  const laeuft = status === 'submitted' || status === 'streaming';
  return (
    <div className="chat">
      <div className="chat-verlauf" aria-live="polite">
        {messages.map((m, i) => (
          <Nachricht key={m.id} m={m} now={now} stand={stand} streamt={laeuft && i === messages.length - 1 && m.role === 'assistant'} />
        ))}
        {status === 'submitted' ? (
          <div className="kg-nachricht kg-nachricht--kollege"><div className="kg-nachricht-wer"><span>Kollege</span></div><div className="kg-nachricht-text"><Laden inline text="Lese mit" /></div></div>
        ) : null}
        {error ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>Das ging nicht – {error.message || 'technischer Fehler'}. Nochmal versuchen?</div> : null}
        <div ref={ende} />
      </div>
      <div className="chat-eingabe">
        <Eingabe onSenden={(text) => sendMessage({ text })} verarbeitet={laeuft} kontext={kontext} platzhalter={platzhalter} autoFocus={start.length > 0} />
      </div>
    </div>
  );
}

// --- sidebar --------------------------------------------------------------------------------

export function ChatListe({ chats, now }: { chats: { id: string; title: string; at: string; pinned: boolean; etikett: string | null }[]; now: string }) {
  const aktiv = /^\/chat\/([0-9a-f-]{36})/.exec(usePathname())?.[1];
  const [q, setQ] = useState('');
  const router = useRouter();
  const term = q.trim().toLowerCase();
  const sicht = chats.filter((c) => !term || `${c.title} ${c.etikett ?? ''}`.toLowerCase().includes(term));
  const pins = sicht.filter((c) => c.pinned);
  const rest = sicht.filter((c) => !c.pinned);
  async function pin(id: string, pinned: boolean) {
    const r = await perform('chat.update', { id, pinned });
    if (r.ok) router.refresh();
  }
  const item = (c: (typeof chats)[number]) => (
    <li key={c.id} className={cx('kg-chat', c.id === aktiv && 'kg-chat--aktiv')}>
      <a className="kg-chat-link" href={`/chat/${c.id}`} aria-current={c.id === aktiv ? 'page' : undefined}>
        <span className="kg-chat-titel">{c.title}</span>
        <span className="kg-chat-meta">{c.etikett ? <span className="kg-chat-etikett">{c.etikett}</span> : null}<span>{zeitpunkt(c.at, new Date(now))}</span></span>
      </a>
      <span className="kg-chat-aktionen">
        <button type="button" onClick={() => pin(c.id, !c.pinned)}>{c.pinned ? 'Lösen' : 'Anpinnen'}</button>
      </span>
    </li>
  );
  return (
    <div className="kg-chatliste">
      <a className="kg-aktion kg-aktion--sekundaer kg-chat-neu" href="/chat" style={{ textDecoration: 'none' }}>+ Neuer Chat</a>
      {chats.length > 5 ? <input type="search" className="kg-chat-suche" placeholder="Chats durchsuchen" value={q} aria-label="Chats durchsuchen" onChange={(e) => setQ(e.target.value)} /> : null}
      {pins.length ? <><div className="kg-chat-gruppe">Angepinnt</div><ul className="kg-chat-ul">{pins.map(item)}</ul></> : null}
      <div className="kg-chat-gruppe">Chats</div>
      {rest.length ? <ul className="kg-chat-ul">{rest.map(item)}</ul> : <div className="kg-chat-leer">{term ? 'Kein Chat passt.' : 'Noch keine Chats.'}</div>}
      <div className="kg-chat-hinweis"><Privat>Chats sind persönlich</Privat></div>
    </div>
  );
}
