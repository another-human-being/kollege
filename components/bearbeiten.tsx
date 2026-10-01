'use client';
// Editing in place (E23, E24): type, leave the field – saved, with undo. Every change is one action.
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Aktion } from './kg';
import { useAktion } from './rueckgaengig';
import { payloadFor, type Ziel } from '@/lib/ziel';

export type { Ziel };

type Change = Ziel;

/** text, number or date field; saves on blur if the value changed */
export function Feld({
  id, wert, art = 'text', change, label, gross, mehrzeilig, breite,
}: { id: string; wert: string; art?: 'text' | 'number' | 'date'; change: Change; label: string; gross?: boolean; mehrzeilig?: boolean; breite?: number }) {
  const { run } = useAktion();
  const [v, setV] = useState(wert);
  const [basis, setBasis] = useState(wert);
  if (wert !== basis) {
    // the server sent a newer value (e.g. after undo)
    setBasis(wert);
    setV(wert);
  }
  async function fertig() {
    if (v === wert) return;
    const r = await run(change.type, payloadFor(change, v));
    if (!r.ok) setV(wert);
  }
  const props = {
    id, value: v, 'aria-label': label, placeholder: '–',
    className: gross ? 'fe fe-titel' : 'fe',
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: fertig,
  };
  return mehrzeilig ? (
    <textarea {...props} rows={2} style={{ width: '100%', fontSize: 16 }} />
  ) : (
    <input {...props} type={art} style={gross ? undefined : { width: breite ?? 260 }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

export function Auswahl({ id, wert, optionen, change, label, leer }: { id: string; wert: string; optionen: string[]; change: Change; label: string; leer?: string }) {
  const { run } = useAktion();
  return (
    <select id={id} className="fe" value={wert} aria-label={label} onChange={(e) => run(change.type, payloadFor(change, e.target.value))}>
      {leer !== undefined || !optionen.includes(wert) ? <option value="">{leer ?? '–'}</option> : null}
      {optionen.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** a button that runs one action */
export function Tu({ type, payload, text, variante = 'sekundaer', children }: { type: string; payload: unknown; text?: string; variante?: 'sekundaer' | 'text' | 'primaer'; children: ReactNode }) {
  const { run } = useAktion();
  const [busy, setBusy] = useState(false);
  return (
    <Aktion variante={variante} disabled={busy} onClick={async () => { setBusy(true); await run(type, payload, text); setBusy(false); }}>
      {children}
    </Aktion>
  );
}

/** Übergeben an … (E45): select a person, the handover waits for acceptance */
export function Uebergeben({ kind, id, andere }: { kind: 'matter' | 'org'; id: string; andere: { id: string; name: string }[] }) {
  const { run } = useAktion();
  return (
    <select className="fe" value="" aria-label="Übergeben an" style={{ fontSize: 13 }}
      onChange={(e) => e.target.value && run(`${kind}.handover`, { id, to_user_id: e.target.value }, 'Übergabe angefragt')}>
      <option value="">Übergeben an …</option>
      {andere.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}

/** "Wie lief's?" when marking done (E15) – one line, can be skipped */
export function Erledigen({ id, offen, titel }: { id: string; offen: boolean; titel: string }) {
  const { run } = useAktion();
  const [frage, setFrage] = useState(false);
  const [text, setText] = useState('');
  if (!offen) return <Tu type="matter.set_status" payload={{ id, status: 'open' }} text="Wieder offen" variante="text">Wieder öffnen</Tu>;
  if (!frage) {
    return <Aktion onClick={async () => { const r = await run('matter.set_status', { id, status: 'done' }, 'Erledigt'); if (r.ok) setFrage(true); }}>Als erledigt markieren</Aktion>;
  }
  async function speichern(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) await run('matter.update', { id, outcome_note: text.trim() }, 'Im Verlauf abgelegt');
    setFrage(false);
  }
  return (
    <form onSubmit={speichern} className="ungeprueft-banner" style={{ borderStyle: 'solid', flexDirection: 'column', alignItems: 'stretch' }}>
      <label htmlFor="wie-lief" style={{ fontWeight: 500 }}>{titel}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="wie-lief" className="such" value={text} onChange={(e) => setText(e.target.value)} placeholder="Eine Zeile reicht – fürs nächste Mal" style={{ flex: 1, fontSize: 15 }} />
        <Aktion type="submit" variante="sekundaer" aria-label="Ablegen">Ablegen</Aktion>
        <Aktion variante="text" onClick={() => setFrage(false)}>Überspringen</Aktion>
      </div>
    </form>
  );
}

/** one-line form: text → action payload */
export function Zeile({ platzhalter, knopf, label, ziel, text }: { platzhalter: string; knopf: string; label: string; ziel: Ziel; text?: string }) {
  const { run } = useAktion();
  const [v, setV] = useState('');
  async function senden(e: FormEvent) {
    e.preventDefault();
    if (!v.trim()) return;
    const r = await run(ziel.type, payloadFor(ziel, v), text);
    if (r.ok) setV('');
  }
  return (
    <form onSubmit={senden} style={{ display: 'flex', gap: 6 }}>
      <input className="such" value={v} onChange={(e) => setV(e.target.value)} placeholder={platzhalter} aria-label={label} style={{ flex: 1 }} />
      <Aktion type="submit">{knopf}</Aktion>
    </form>
  );
}

/** a conversation with date, kind and participants (E50) */
export function Gespraech({ targetType, targetId, heute }: { targetType: 'org' | 'matter'; targetId: string; heute: string }) {
  const { run } = useAktion();
  const [datum, setDatum] = useState(heute);
  const [art, setArt] = useState('Beratung');
  const [mit, setMit] = useState('');
  const [text, setText] = useState('');
  async function senden(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await run('note.create', {
      target_type: targetType, target_id: targetId, body_text: text.trim(),
      occurred_at: `${datum}T12:00:00+00:00`, conversation: { art, mit: mit.trim() },
    }, 'Gespräch notiert');
    if (r.ok) { setText(''); setMit(''); }
  }
  return (
    <form onSubmit={senden} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" className="fe" value={datum} onChange={(e) => setDatum(e.target.value)} aria-label="Datum des Gesprächs" style={{ fontSize: 13 }} />
        <select className="fe" value={art} onChange={(e) => setArt(e.target.value)} aria-label="Art" style={{ fontSize: 13 }}>
          {['Beratung', 'Telefonat', 'Treffen', 'Mail', 'Sonstiges'].map((a) => <option key={a}>{a}</option>)}
        </select>
        <input className="fe" value={mit} onChange={(e) => setMit(e.target.value)} placeholder="mit wem?" aria-label="Teilnehmende" style={{ flex: 1, minWidth: 120, fontSize: 13 }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="such" value={text} onChange={(e) => setText(e.target.value)} placeholder="Was wurde besprochen, was vereinbart?" aria-label="Was wurde besprochen?" style={{ flex: 1 }} />
        <Aktion type="submit">+ Gespräch</Aktion>
      </div>
    </form>
  );
}

/** "+ Neu": title first, then the new entry opens */
export function NeuAnlegen({ label, ziel, oeffnen }: { label: string; ziel: Ziel; oeffnen: string }) {
  const { run } = useAktion();
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [v, setV] = useState('');
  if (!offen) return <Aktion onClick={() => setOffen(true)}>{label}</Aktion>;
  async function senden(e: FormEvent) {
    e.preventDefault();
    if (!v.trim()) return;
    const r = await run(ziel.type, payloadFor(ziel, v), 'Angelegt');
    if (r.ok) {
      setOffen(false);
      setV('');
      router.push(`${oeffnen}${(r.result as { id: string }).id}`);
    }
  }
  return (
    <form onSubmit={senden} style={{ display: 'flex', gap: 6 }}>
      <input autoFocus className="such" value={v} onChange={(e) => setV(e.target.value)} placeholder="Titel" aria-label="Titel" style={{ width: 220 }} />
      <Aktion type="submit">Anlegen</Aktion>
      <Aktion variante="text" onClick={() => setOffen(false)}>Abbrechen</Aktion>
    </form>
  );
}

/** "Aus Vorjahr": pick the predecessor, give the new title */
export function AusVorjahr({ vorlagen, oeffnen }: { vorlagen: { id: string; title: string }[]; oeffnen: string }) {
  const { run } = useAktion();
  const router = useRouter();
  const [von, setVon] = useState('');
  const [titel, setTitel] = useState('');
  async function senden(e: FormEvent) {
    e.preventDefault();
    if (!von || !titel.trim()) return;
    const r = await run('matter.create_from_previous', { previous_id: von, title: titel.trim() }, 'Aus Vorjahr angelegt');
    if (r.ok) router.push(`${oeffnen}${(r.result as { id: string }).id}`);
  }
  return (
    <form onSubmit={senden} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select className="fe" value={von} aria-label="Aus Vorjahr" style={{ fontSize: 13 }}
        onChange={(e) => { setVon(e.target.value); const t = vorlagen.find((x) => x.id === e.target.value)?.title ?? ''; setTitel(t.replace(/(\d{4})/, (y) => String(Number(y) + 1))); }}>
        <option value="">Aus Vorjahr …</option>
        {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
      </select>
      {von ? <><input className="such" value={titel} onChange={(e) => setTitel(e.target.value)} aria-label="Titel" style={{ width: 200 }} /><Aktion type="submit">Anlegen</Aktion></> : null}
    </form>
  );
}

export interface Zeile {
  id: string;
  href: string;
  aktiv: boolean;
  zellen: { text: string; klasse?: string }[];
}

/** review mode (E25): select some or all, take over or discard (+ optional why) */
export function Pruefen({ typ, raster, zeilen }: { typ: 'matter' | 'org' | 'person'; raster: string; zeilen: Zeile[] }) {
  const { run } = useAktion();
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [warum, setWarum] = useState<string | null>(null);
  const toggle = (id: string) => setAuswahl((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const alle = auswahl.size === zeilen.length && zeilen.length > 0;
  const payload = () => ({ items: [...auswahl].map((id) => ({ type: typ, id })) });
  return (
    <>
      <div className="pruefleiste">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <input type="checkbox" checked={alle} onChange={() => setAuswahl(alle ? new Set() : new Set(zeilen.map((i) => i.id)))} style={{ accentColor: 'var(--ink)' }} /> alle {zeilen.length}
          </label>
          <span className="mono" style={{ flexGrow: 1 }}>{auswahl.size} ausgewählt</span>
        </div>
        {auswahl.size ? (
          <div className="kg-aktionen">
            <Aktion onClick={async () => { await run('review.accept', payload(), `${auswahl.size} übernommen`); setAuswahl(new Set()); }}>Übernehmen</Aktion>
            <Aktion onClick={() => setWarum(warum === null ? '' : null)}>Verwerfen …</Aktion>
          </div>
        ) : null}
        {warum !== null && auswahl.size ? (
          <form style={{ display: 'flex', gap: 6 }} onSubmit={async (e) => {
            e.preventDefault();
            await run('review.discard', { ...payload(), reason: warum.trim() || undefined }, `${auswahl.size} verworfen`);
            setAuswahl(new Set()); setWarum(null);
          }}>
            <input className="such" value={warum} onChange={(e) => setWarum(e.target.value)} aria-label="Warum verwerfen?" placeholder="Warum? (optional) – hilft beim nächsten Mal" style={{ flex: 1 }} />
            <Aktion type="submit">Verwerfen</Aktion>
          </form>
        ) : null}
      </div>
      {zeilen.map((z) => (
        <div key={z.id} className="pzb">
          <input type="checkbox" aria-label={`${z.zellen[0]?.text ?? ''} auswählen`} checked={auswahl.has(z.id)} onChange={() => toggle(z.id)} />
          <a className="tz" style={{ gridTemplateColumns: raster }} href={z.href} aria-current={z.aktiv ? 'true' : undefined}>
            {z.zellen.map((c, i) => <span key={i} className={c.klasse}>{c.text}</span>)}
          </a>
        </div>
      ))}
    </>
  );
}
