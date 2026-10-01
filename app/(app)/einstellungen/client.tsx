'use client';
import { useState } from 'react';
import { Aktion } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';
import type { AreaField } from '@/lib/views/areas';

const TYPEN: [AreaField['type'], string][] = [['text', 'Text'], ['date', 'Datum'], ['number', 'Zahl'], ['select', 'Auswahl'], ['person', 'Person']];

/** phases as one line "Idee, Vorgründung, gegründet" – a simple choice, no workflow (§4.3) */
export function Phasen({ id, phasen }: { id: string; phasen: string[] }) {
  const { run } = useAktion();
  const [v, setV] = useState(phasen.join(', '));
  return (
    <input className="fe" value={v} aria-label="Phasen, durch Komma getrennt" placeholder="keine" style={{ width: 360 }}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const next = v.split(',').map((p) => p.trim()).filter(Boolean);
        if (next.join('|') !== phasen.join('|')) void run('area.update', { id, phases: next });
      }} />
  );
}

/** the area's fields (columns): label, type, options, "aus Vorjahr übernehmen" */
export function BereichFelder({ id, felder }: { id: string; felder: AreaField[] }) {
  const { run } = useAktion();
  const speichern = (next: AreaField[]) => run('area.update', { id, fields: next });
  const aendern = (i: number, patch: Partial<AreaField>) => speichern(felder.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const [neu, setNeu] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {felder.map((f, i) => (
        <div key={f.key} className="feldzeile" style={{ borderTop: '1px solid var(--rule)', paddingTop: 8 }}>
          <input className="fe" defaultValue={f.label} aria-label={`Name der Spalte ${f.label}`} style={{ width: 180 }}
            onBlur={(e) => e.target.value.trim() && e.target.value !== f.label && aendern(i, { label: e.target.value.trim() })} />
          <span className="mono">{TYPEN.find(([t]) => t === f.type)?.[1]}</span>
          {f.key === 'phase' ? (
            <span className="mono">Werte = Phasen oben</span>
          ) : f.type === 'select' ? (
            <input className="fe" defaultValue={(f.options ?? []).join(', ')} aria-label={`Auswahl für ${f.label}`} style={{ width: 220 }}
              onBlur={(e) => aendern(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} />
          ) : null}
          <label style={{ fontSize: 13, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={Boolean(f.carry_over)} onChange={(e) => aendern(i, { carry_over: e.target.checked })} style={{ accentColor: 'var(--ink)' }} />
            aus Vorjahr übernehmen
          </label>
          <Aktion variante="text" onClick={() => speichern(felder.filter((_, j) => j !== i))}>Entfernen</Aktion>
        </div>
      ))}
      {felder.length < 5 ? (
        <form className="feldzeile" onSubmit={(e) => {
          e.preventDefault();
          const label = neu.trim();
          if (!label) return;
          const form = e.currentTarget;
          const type = (form.elements.namedItem('typ') as HTMLSelectElement).value as AreaField['type'];
          const key = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') || 'feld';
          void speichern([...felder, { key: felder.some((f) => f.key === key) ? `${key}_${felder.length}` : key, label, type }]);
          setNeu('');
        }}>
          <input className="such" value={neu} onChange={(e) => setNeu(e.target.value)} placeholder="+ Spalte" aria-label="Neue Spalte" style={{ width: 180 }} />
          <select name="typ" className="fe" aria-label="Art der Spalte">{TYPEN.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select>
          <Aktion type="submit">Hinzufügen</Aktion>
        </form>
      ) : <span className="mono">Mehr als 5 Spalten passen nicht in die Liste.</span>}
    </div>
  );
}
