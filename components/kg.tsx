// Bausteine des Design Systems (design/design-system/components/bundle.js) als typisierte
// React-Komponenten. Gleiche Klassen wie bundle.css; ohne eigenen Zustand, damit sie in
// Server- und Client-Komponenten funktionieren. Abweichungen vom Bundle (Befunde, STAND.md):
// - Navigation ohne Zähler (Regel „keine Zähler“, M2)
// - Verlauf: Systemschritte ohne „Rückgängig“ (korrigieren statt rückgängig, Entscheidung 7)
import { Icon } from '@/components/icon';
import type { ReactNode } from 'react';

export type Herkunft = 'belegt' | 'berechnet' | 'einschaetzung';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const ZEICHEN: Record<Herkunft, string> = { belegt: '▪', berechnet: '=', einschaetzung: '~' };
const LESBAR: Record<Herkunft, string> = { belegt: 'belegt', berechnet: 'berechnet', einschaetzung: 'KI-Vermutung' };

export function Vermutung({ children }: { children?: ReactNode }) {
  return (
    <span className="kg-vermutung" title="Ungeprüft: Deutung des Systems, kein Beleg">
      {children ?? 'KI-Vermutung'}
    </span>
  );
}

export function Privat({ nurSymbol, fuer, children }: { nurSymbol?: boolean; fuer?: string; children?: ReactNode }) {
  const wer = fuer ? `nur für ${fuer}` : 'nur für dich';
  return (
    <span className="kg-privat" title={`Privat: ${wer} sichtbar`}>
      <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" focusable="false">
        <rect x="1.5" y="5.5" width="8" height="6" rx="1" fill="none" stroke="currentColor" />
        <path d="M3 5.5V3.8a2.5 2.5 0 0 1 5 0v1.7" fill="none" stroke="currentColor" />
      </svg>
      {nurSymbol ? <span className="kg-sr">privat, {wer}</span> : <span>{children ?? (fuer ? `nur ${fuer}` : 'privat')}</span>}
    </span>
  );
}

/** a source without a target is plain text, not a dead button (Ü11) */
export function Quelle({ href, title, children }: { href?: string; title?: string; children: ReactNode }) {
  if (!href) return <span className="kg-quelle">{children}</span>;
  return (
    <a className="kg-quelle" href={href} title={title ?? 'Quelle öffnen'}>
      {children}
    </a>
  );
}

export function Bezug({ href, art, children }: { href: string; art?: string; children: ReactNode }) {
  return (
    <a className="kg-bezug" href={href} title={art}>
      {children}
    </a>
  );
}

export function Aussage({
  art = 'belegt', quelle, quelleHref, marke, dringend, inline, children,
}: { art?: Herkunft; quelle?: string; quelleHref?: string; marke?: boolean; dringend?: boolean; inline?: boolean; children: ReactNode }) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={cx('kg-aussage', `kg-aussage--${art}`, dringend && 'kg-aussage--dringend', inline && 'kg-aussage-inline')}>
      <span className="kg-glyph" aria-hidden="true">{ZEICHEN[art]}</span>
      <span className="kg-aussage-text">
        <span className="kg-sr">{LESBAR[art]}: </span>
        {children}
        {art === 'einschaetzung' && marke !== false ? <> <Vermutung /></> : null}
        {quelle ? <> {' '}<Quelle href={quelleHref}>{quelle}</Quelle></> : null}
      </span>
    </Tag>
  );
}

export type AktionVariante = 'primaer' | 'sekundaer' | 'text' | 'rueckgaengig';

export function Aktion({
  variante = 'sekundaer', onClick, disabled, type = 'button', children, ...rest
}: {
  variante?: AktionVariante;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children?: ReactNode;
  'aria-label'?: string;
  title?: string;
}) {
  return (
    <button type={type} className={cx('kg-aktion', `kg-aktion--${variante}`)} onClick={onClick} disabled={disabled} {...rest}>
      {variante === 'rueckgaengig' ? <span aria-hidden="true">↶</span> : null}
      {children ?? (variante === 'rueckgaengig' ? 'Rückgängig' : null)}
    </button>
  );
}

export function Etikett({ children }: { children: ReactNode }) {
  return <span className="kg-etikett">{children}</span>;
}

/** controlled; options are links so it works without JavaScript */
export function Umschalter({ label, optionen }: { label: string; optionen: { label: string; href: string; aktiv: boolean }[] }) {
  return (
    <div className="kg-umschalter" role="group" aria-label={label}>
      {optionen.map((o) => (
        <a key={o.label} href={o.href} aria-current={o.aktiv ? 'true' : undefined} role="button" aria-pressed={o.aktiv}>
          {o.label}
        </a>
      ))}
    </div>
  );
}

export function Abschnitt({
  titel, anzahl, aside, leer, children, id,
}: { titel: ReactNode; anzahl?: number; aside?: ReactNode; leer?: ReactNode; children?: ReactNode; id?: string }) {
  const hatInhalt = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section className="kg-abschnitt" aria-labelledby={id}>
      <div className="kg-abschnitt-kopf">
        <h2 className="kg-abschnitt-titel" id={id}>{titel}</h2>
        {anzahl != null ? <span className="kg-abschnitt-zahl">{anzahl}</span> : null}
        {aside ? <span className="kg-abschnitt-aside">{aside}</span> : null}
      </div>
      {hatInhalt ? <div className="kg-abschnitt-liste">{children}</div> : (leer ?? null)}
    </section>
  );
}

export function Leer({ titel, text, aktion }: { titel: string; text?: string; aktion?: ReactNode }) {
  return (
    <div className="kg-leer">
      <div className="kg-leer-titel">{titel}</div>
      {text ? <div className="kg-leer-text">{text}</div> : null}
      {aktion ? <div className="kg-aktionen">{aktion}</div> : null}
    </div>
  );
}

export function Laden({ text, inline }: { text?: string; inline?: boolean }) {
  return inline ? (
    <span className="kg-laden kg-laden-inline" role="status"><span className="kg-laden-punkte">{text ?? 'Lade'}</span></span>
  ) : (
    <div className="kg-laden" role="status"><div className="kg-laden-zeile"><span className="kg-laden-punkte">{text ?? 'Lade'}</span></div></div>
  );
}

export interface Grund {
  art: Herkunft;
  text: ReactNode;
  quelle?: string;
  quelleHref?: string;
  dringend?: boolean;
}

export function Hinweis({
  zeit, titel, kontext, gruende, aktionen, dringend, children,
}: { zeit: string; titel: ReactNode; kontext?: ReactNode; gruende?: Grund[]; aktionen?: ReactNode; dringend?: boolean; children?: ReactNode }) {
  return (
    <article className={cx('kg-hinweis', dringend && 'kg-hinweis--dringend')}>
      <div className="kg-hinweis-zeit">{zeit}</div>
      <div className="kg-hinweis-body">
        <div className="kg-hinweis-titel">{titel}</div>
        {kontext ? <div className="kg-hinweis-kontext">{kontext}</div> : null}
        {gruende?.length ? (
          <div className="kg-hinweis-gruende">
            {gruende.map((g, i) => (
              <Aussage key={i} art={g.art} quelle={g.quelle} quelleHref={g.quelleHref} dringend={g.dringend}>{g.text}</Aussage>
            ))}
          </div>
        ) : null}
        {aktionen ? <div className="kg-aktionen kg-hinweis-aktionen">{aktionen}</div> : null}
        {children}
      </div>
    </article>
  );
}

export interface VerlaufEintrag {
  key: string;
  monat?: string;
  datum: string;
  art: 'Mail' | 'Termin' | 'Notiz' | 'Datei' | 'System' | 'Gespräch';
  text: ReactNode;
  quelle?: string;
  herkunft?: string;
  privat?: boolean;
  privatFuer?: string;
}

export function Verlauf({ eintraege, label }: { eintraege: VerlaufEintrag[]; label?: string }) {
  const out: ReactNode[] = [];
  let monat: string | undefined;
  for (const e of eintraege) {
    if (e.monat && e.monat !== monat) {
      monat = e.monat;
      out.push(<li key={`m-${e.key}`} className="kg-verlauf-monat" aria-hidden="true">{e.monat}</li>);
    }
    out.push(
      <li key={e.key} className={cx('kg-verlauf-eintrag', e.art === 'System' && 'kg-verlauf-eintrag--system')}>
        <span className="kg-verlauf-datum">{e.datum}</span>
        <span className="kg-verlauf-art">{e.art}</span>
        <span className="kg-verlauf-text">
          <span>
            {e.privat ? <><Privat nurSymbol fuer={e.privatFuer} /> </> : null}
            {e.text}
            {e.quelle ? <> {' '}<Quelle>{e.quelle}</Quelle></> : null}
            {e.herkunft ? <span className="kg-verlauf-herkunft">{e.herkunft}</span> : null}
          </span>
        </span>
      </li>,
    );
  }
  return <ol className="kg-verlauf" aria-label={label ?? 'Verlauf'}>{out}</ol>;
}

const ZUSAGE_ZEICHEN = { offen: '○', ueberfaellig: '!', erledigt: '✓' } as const;

export function Zusage({
  status = 'offen', faellig, quelle, children, aktion,
}: { status?: 'offen' | 'ueberfaellig' | 'erledigt'; faellig?: string; quelle?: ReactNode; children: ReactNode; aktion?: ReactNode }) {
  return (
    <div className={cx('kg-zusage', `kg-zusage--${status}`)}>
      <span className="kg-zusage-zeichen" aria-hidden="true">{ZUSAGE_ZEICHEN[status]}</span>
      <span>
        <span className="kg-zusage-text">{children}</span>
        {quelle ? <span className="kg-zusage-quelle">{quelle}</span> : null}
      </span>
      <span className="kg-zusage-faellig">
        {status === 'ueberfaellig' ? (faellig ?? 'überfällig') : status === 'erledigt' ? 'erledigt' : (faellig ?? '')}
        {aktion}
      </span>
    </div>
  );
}

export function Anweisung({
  geltung, von, angewandt, children, aktionen,
}: { geltung: string; von?: string; angewandt?: string; children: ReactNode; aktionen?: ReactNode }) {
  return (
    <div className="kg-anweisung">
      <div className="kg-anweisung-text">„{children}“</div>
      <Etikett>{geltung}</Etikett>
      <div className="kg-anweisung-meta">
        {von ? <span>{von}</span> : null}
        {angewandt ? <span>= {angewandt}</span> : null}
        {aktionen}
      </div>
    </div>
  );
}

// --- Schritte (E54): what Kollege did – read, searched with hits, found or a gap ---------------

export interface SchrittT { art: 'lesen' | 'suche' | 'gefunden' | 'luecke'; text: ReactNode; funde?: string[] }

export function Schritte({ schritte }: { schritte: SchrittT[] }) {
  return (
    <ol className="kg-schritte" aria-label="Was Kollege getan hat" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {schritte.map((s, i) => (
        <li key={i} className="kg-schritt">
          <Icon name={s.art} />
          <span>{s.text}{s.funde?.length ? <span style={{ display: 'block' }}>{s.funde.map((f, j) => <span key={j} className="kg-fund">{f}</span>)}</span> : null}</span>
        </li>
      ))}
    </ol>
  );
}
