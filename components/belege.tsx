'use client';
// "Worauf das beruht" on a contact (10.10.): the mails, events and files that mention the person or
// organisation, and what the web search found with its pages. A click opens the entry at the bottom
// right; "‹ ›" goes through all of them without leaving the contact.
import { useCallback, useEffect, useState } from 'react';
import { Aussage } from '@/components/kg';
import type { WebStand } from '@/lib/kontakte/websuche';
import type { Beleg, BelegZeile } from '@/lib/views/belege';

const tag = (iso: string) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso));
const ORG_ART: Record<string, string> = { university: 'Hochschule', partner: 'Partner', founding_team: 'Gründungsteam', other: 'Organisation' };

function Ansicht({ belege, index, wechseln, schliessen }: { belege: BelegZeile[]; index: number; wechseln: (i: number) => void; schliessen: () => void }) {
  const zeile = belege[index]!;
  const [b, setB] = useState<Beleg | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  useEffect(() => {
    let weg = false;
    setB(null); setFehler(null);
    fetch(`/api/eintrag/${zeile.id}`).then(async (r) => {
      if (weg) return;
      if (r.ok) setB(await r.json());
      else setFehler(r.status === 404 ? 'Diesen Eintrag darfst du nicht lesen, oder es gibt ihn nicht mehr.' : 'Konnte nicht geladen werden.');
    }).catch(() => !weg && setFehler('Konnte nicht geladen werden.'));
    return () => { weg = true; };
  }, [zeile.id]);
  const taste = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') schliessen();
    if (e.key === 'ArrowLeft' && index > 0) wechseln(index - 1);
    if (e.key === 'ArrowRight' && index < belege.length - 1) wechseln(index + 1);
  }, [index, belege.length, wechseln, schliessen]);
  useEffect(() => { window.addEventListener('keydown', taste); return () => window.removeEventListener('keydown', taste); }, [taste]);

  return (
    <aside className="beleg-ansicht" role="dialog" aria-label={`${zeile.art}: ${zeile.titel}`}>
      <div className="beleg-kopf">
        <span className="mono">{zeile.art} · {tag(zeile.am)}</span>
        <span style={{ flexGrow: 1 }} />
        <button type="button" className="beleg-knopf" aria-label="Vorheriger Beleg" disabled={index === 0} onClick={() => wechseln(index - 1)}>‹</button>
        <span className="mono">{index + 1} / {belege.length}</span>
        <button type="button" className="beleg-knopf" aria-label="Nächster Beleg" disabled={index === belege.length - 1} onClick={() => wechseln(index + 1)}>›</button>
        <button type="button" className="beleg-knopf" aria-label="Beleg schließen" onClick={schliessen}>×</button>
      </div>
      <h3 className="beleg-titel">{zeile.titel}</h3>
      {fehler ? <p className="mono">{fehler}</p> : !b ? <p className="mono">Lädt …</p> : (
        <>
          {b.von || b.an ? (
            <div className="beleg-adr mono">
              {b.von ? <div>Von: {b.von}</div> : null}
              {b.an ? <div>An: {b.an}</div> : null}
            </div>
          ) : null}
          <div className="beleg-text">{b.text || '(kein Text)'}</div>
          {b.anhaenge.length ? <div className="mono">Anhänge: {b.anhaenge.join(', ')}</div> : null}
          <a className="kg-bezug" href={b.href}>{b.art === 'Mail' ? 'In Mail öffnen' : b.art === 'Termin' ? 'Im Kalender öffnen' : b.art === 'Datei' ? 'In Dateien öffnen' : 'Öffnen'} →</a>
        </>
      )}
    </aside>
  );
}

export function Grundlage({ belege, web }: { belege: BelegZeile[]; web?: WebStand | null }) {
  const [offen, setOffen] = useState<number | null>(null);
  if (!belege.length && !web) return null;
  return (
    <section className="grundlage" aria-labelledby="g-titel">
      <h2 id="g-titel" className="grundlage-titel">Worauf das beruht</h2>
      {web?.status === 'gefunden' ? (
        <div>
          <Aussage art="einschaetzung">
            Websuche: {web.organisation}{web.art && web.art !== 'other' ? ` (${ORG_ART[web.art]})` : ''}{web.funktion ? ` · ${web.funktion}` : ''}
          </Aussage>
          <ul className="grundlage-liste">
            {web.quellen?.map((q) => (
              <li key={q.url}><a className="kg-bezug" href={q.url} target="_blank" rel="noopener noreferrer">{q.titel || new URL(q.url).hostname}</a> <span className="mono">{new URL(q.url).hostname}</span></li>
            ))}
          </ul>
        </div>
      ) : web?.status === 'unklar' ? (
        <p className="mono">Websuche: keine eindeutig passende Person gefunden.</p>
      ) : null}
      {belege.length ? (
        <ul className="grundlage-liste">
          {belege.map((b, i) => (
            <li key={b.id}>
              <button type="button" className="grundlage-zeile" aria-current={offen === i ? 'true' : undefined} onClick={() => setOffen(i)}>
                <span className="mono">{b.art} · {tag(b.am)}</span><span>{b.titel}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {offen !== null && belege[offen] ? <Ansicht belege={belege} index={offen} wechseln={setOffen} schliessen={() => setOffen(null)} /> : null}
    </section>
  );
}
