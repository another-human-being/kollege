'use client';
// Seitenleiste (E51, E55): one field "Neuer Chat oder Suche" · Heute, Chat · Werkzeuge · Bereiche as
// a tree of their running entries · Einstellungen · the account at the bottom. Collapsible to 58 px.
// The only number is a stock (open tasks of an entry), never news (E40). Open/closed parts are
// remembered in this browser.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { chatAnlegen } from '@/app/actions';
import { ausstehend } from '@/components/chat';
import { bereichIcon, Icon, type IconName } from '@/components/icon';
import type { NavBereich } from '@/lib/views/nav';
import type { Treffer } from '@/lib/views/suche';

const merken = (k: string, v: string) => { try { localStorage.setItem(`kollege.${k}`, v); } catch { /* storage blocked */ } };
const gemerkt = (k: string) => { try { return localStorage.getItem(`kollege.${k}`); } catch { return null; } };

const WERKZEUGE: [string, string, IconName][] = [
  ['/mail', 'Mail', 'mail'], ['/kalender', 'Kalender', 'kalender'], ['/aufgaben', 'Aufgaben', 'aufgaben'], ['/dateien', 'Dateien', 'dateien'], ['/kontakte', 'Kontakte', 'kontakte'],
];

function Gruppe({ id, titel, children }: { id: string; titel: string; children: ReactNode }) {
  const [offen, setOffen] = useState(true);
  useEffect(() => { if (gemerkt(`gruppe.${id}`) === 'zu') setOffen(false); }, [id]);
  return (
    <details className="sb-gruppe" open={offen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; setOffen(o); merken(`gruppe.${id}`, o ? 'auf' : 'zu'); }}>
      <summary><span className="sb-text">{titel}</span><Icon name="runter" className="kg-ic sb-pfeil" /></summary>
      {children}
    </details>
  );
}

/** the field: typing searches (hits to open), Enter asks Kollege in a new chat (E55) */
function Frage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [treffer, setTreffer] = useState<Treffer[]>([]);
  const [wahl, setWahl] = useState(-1);
  const [laeuft, setLaeuft] = useState(false);
  const feld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); feld.current?.focus(); }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, []);
  useEffect(() => {
    setWahl(-1);
    if (text.trim().length < 2) { setTreffer([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/suche?q=${encodeURIComponent(text.trim())}`);
        if (r.ok) setTreffer(await r.json());
      } catch { /* no hits */ }
    }, 150);
    return () => clearTimeout(t);
  }, [text]);

  async function fragen() {
    if (laeuft) return;
    setLaeuft(true);
    const t = text.trim();
    if (!t) { router.push('/chat'); setLaeuft(false); return; }
    const r = await chatAnlegen(t);
    setLaeuft(false);
    if (!r.ok) return;
    const id = (r.result as { id: string }).id;
    try { sessionStorage.setItem(ausstehend(id), t); } catch { /* the chat opens empty */ }
    setText('');
    feld.current?.blur();
    router.push(`/chat/${id}`);
  }

  return (
    <div className="sb-frage">
      <label className="sb-feld" title="Neuer Chat oder Suche (⌘K)">
        <Icon name="suche" />
        <input ref={feld} className="sb-eingabe sb-text" type="text" placeholder="Neuer Chat oder Suche" aria-label="Neuer Chat oder Suche"
          autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} aria-expanded={text.length > 0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setWahl((w) => Math.min(w + 1, treffer.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setWahl((w) => Math.max(w - 1, -1)); }
            else if (e.key === 'Escape') { setText(''); feld.current?.blur(); }
            else if (e.key === 'Enter') {
              e.preventDefault();
              if (wahl >= 0 && treffer[wahl]) { router.push(treffer[wahl]!.href); setText(''); feld.current?.blur(); }
              else void fragen();
            }
          }} />
        <kbd className="sb-text">⌘K</kbd>
      </label>
      <button type="button" className="sb-frage-zu" title="Neuer Chat" aria-label="Neuer Chat" onClick={() => router.push('/chat')}><Icon name="neu" /></button>
      <div className="sb-vorschlag" role="listbox" aria-label="Vorschläge">
        <button type="button" role="option" aria-selected={wahl === -1} className={`sb-v${wahl === -1 ? ' sb-v-erst' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => void fragen()}>
          <Icon name="neu" /><span>{text.trim() ? `Kollege fragen: „${text.trim().slice(0, 40)}“` : 'Neuer Chat'}</span><kbd>↵</kbd>
        </button>
        {treffer.length ? <span className="sb-v-k">Treffer</span> : null}
        {treffer.map((t, i) => (
          <Link key={`${t.href}${i}`} href={t.href} role="option" aria-selected={wahl === i} className={`sb-v${wahl === i ? ' sb-v-erst' : ''}`}
            onMouseDown={(e) => e.preventDefault()} onClick={() => { setText(''); feld.current?.blur(); }}>
            <span>{t.titel}</span><span className="sb-v-art">{t.unter ? `${t.art} · ${t.unter}` : t.art}</span>
          </Link>
        ))}
        <span className="sb-v-fuss">Tippen sucht in Einträgen, Mails, Kontakten, Dateien, Terminen und Aufgaben · ↵ fragt Kollege.</span>
      </div>
    </div>
  );
}

function Ast({ b }: { b: NavBereich }) {
  const path = usePathname();
  const sp = useSearchParams();
  const hier = path === `/b/${b.key}`;
  const [offen, setOffen] = useState(hier || b.key === 'founding_teams');
  useEffect(() => {
    const g = gemerkt(`ast.${b.key}`);
    if (hier) setOffen(true);
    else if (g) setOffen(g === 'auf');
  }, [b.key, hier]);
  const aktiv = hier ? sp.get('id') : null;
  return (
    <details className="sb-ast" open={offen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; setOffen(o); merken(`ast.${b.key}`, o ? 'auf' : 'zu'); }}>
      <summary>
        <Link href={`/b/${b.key}`} title={b.name_plural} aria-current={hier && !aktiv ? 'page' : undefined} className={hier && aktiv ? 'sb-hier' : undefined}>
          <Icon name={bereichIcon(b.key)} /><span className="sb-text">{b.name_plural}</span>
        </Link>
        {b.eintraege.length ? <span className="sb-auf sb-text" title="Einträge ein- oder ausklappen"><Icon name="runter" className="kg-ic sb-pfeil" /></span> : null}
      </summary>
      <div className="sb-baum">
        {b.eintraege.map((e) => (
          <Link key={e.id} href={e.href} className="sb-kind" aria-current={aktiv === e.id ? 'true' : undefined}
            title={e.offen ? `${e.titel} · ${e.offen} offene Aufgabe${e.offen === 1 ? '' : 'n'}` : e.titel}>
            <span className="sb-text">{e.titel}</span>
            {e.offen ? <span className="sb-zahl sb-text" aria-label={`${e.offen} offen`}>{e.offen}</span> : null}
          </Link>
        ))}
        {b.gesamt > b.eintraege.length ? <Link href={`/b/${b.key}`} className="sb-kind sb-alle"><span className="sb-text">Alle {b.gesamt} →</span></Link> : null}
      </div>
    </details>
  );
}

export function Seitenleiste({ areas, me, abmelden }: { areas: NavBereich[]; me: string; abmelden: () => Promise<void> }) {
  const path = usePathname();
  const [zu, setZu] = useState(false);
  useEffect(() => { if (gemerkt('leiste') === 'zu') setZu(true); }, []);
  useEffect(() => { document.querySelector('.app')?.toggleAttribute('data-leiste-zu', zu); }, [zu]);
  const link = (href: string, label: string, icon: IconName) => (
    <Link key={href} href={href} title={label} aria-current={path === href || path.startsWith(`${href}/`) ? 'page' : undefined}>
      <Icon name={icon} /><span className="sb-text">{label}</span>
    </Link>
  );
  return (
    <aside className="sb" id="seitenleiste" aria-label="Seitenleiste">
      <div className="sb-kopf">
        <span className="sb-marke">Kollege</span>
        <button type="button" className="sb-knopf" aria-pressed={zu} aria-label={zu ? 'Seitenleiste aufklappen' : 'Seitenleiste einklappen'}
          title="Seitenleiste ein- oder ausklappen" onClick={() => { setZu(!zu); merken('leiste', zu ? 'auf' : 'zu'); }}>
          <Icon name="leiste" />
        </button>
      </div>
      <Frage />
      <nav className="kg-seitennav" aria-label="Hauptnavigation">
        <div className="sb-block">{link('/heute', 'Heute', 'heute')}{link('/chat', 'Chat', 'chat')}</div>
        <Gruppe id="werkzeuge" titel="Werkzeuge">{WERKZEUGE.map(([h, l, i]) => link(h, l, i))}</Gruppe>
        <Gruppe id="bereiche" titel="Bereiche">
          {areas.map((b) => <Ast key={b.key} b={b} />)}
          <Link href="/einstellungen?reiter=Bereiche" className="nav-plus" title="Bereich anlegen"><Icon name="plus" /><span className="sb-text">Bereich</span></Link>
        </Gruppe>
        <div className="sb-block">{link('/einstellungen', 'Einstellungen', 'einstellungen')}</div>
      </nav>
      <details className="sb-konto">
        <summary title={`${me} · Konto`}>
          <span className="sb-avatar" aria-hidden="true">{me.slice(0, 1)}</span>
          <span className="sb-text sb-konto-name"><b>{me}</b><span>Gründungszentrum</span></span>
          <Icon name="pfeil" className="kg-ic sb-text" />
        </summary>
        <div className="sb-menue" role="menu">
          <Link role="menuitem" href="/einstellungen?reiter=Quellen">Meine Postfächer und Kalender</Link>
          <Link role="menuitem" href="/einstellungen?reiter=Anweisungen">Meine Anweisungen</Link>
          <Link role="menuitem" href="/einstellungen?reiter=Benachrichtigungen">Benachrichtigungen</Link>
          <form action={abmelden}><button type="submit" role="menuitem">Abmelden</button></form>
        </div>
      </details>
    </aside>
  );
}
