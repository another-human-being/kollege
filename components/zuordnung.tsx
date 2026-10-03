'use client';
// "Gehört zu" of an entry (mail thread, file): links with "KI-Vermutung" for what the model set,
// remove, add. Every change goes through entry.link / entry.unlink with undo.
import { Etikett } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';

export interface Bezug { type: string; id: string; name: string; origin: string; link_id: string }
export interface Ziel { type: 'matter' | 'org'; id: string; name: string }

export function Zuordnung({ entryId, bezuege, ziele }: { entryId: string; bezuege: Bezug[]; ziele: Ziel[] }) {
  const { run } = useAktion();
  return (
    <div className="filterzeile" role="group" aria-label="Gehört zu">
      <span className="mono">Gehört zu</span>
      {bezuege.map((b) => (
        <span key={b.link_id} className="bz">
          <a className="kg-bezug" href={b.type === 'matter' ? `/m/${b.id}` : b.type === 'org' ? `/o/${b.id}` : `/p/${b.id}`}>{b.name}</a>
          {b.origin === 'model' ? <Etikett>KI-Vermutung</Etikett> : null}
          <button type="button" className="kg-aktion kg-aktion--text" aria-label={`${b.name} entfernen`}
            onClick={() => run('entry.unlink', { link_id: b.link_id }, 'Zuordnung entfernt')}>×</button>
        </span>
      ))}
      <select aria-label="Zuordnen zu" className="chip" value="" onChange={(e) => {
        const [type, id] = e.target.value.split(':');
        if (type && id) void run('entry.link', { entry_id: entryId, target_type: type, target_id: id }, 'Zugeordnet');
      }}>
        <option value="">+ zuordnen</option>
        {ziele.map((z) => <option key={`${z.type}:${z.id}`} value={`${z.type}:${z.id}`}>{z.name}</option>)}
      </select>
    </div>
  );
}
