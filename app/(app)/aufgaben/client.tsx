'use client';
import { useAktion } from '@/components/rueckgaengig';

/** "Verschieben nach …" – status change, also the keyboard way for the board (E44) */
export function StatusWahl({ id, status, ours }: { id: string; status: 'open' | 'in_progress' | 'done'; ours: boolean }) {
  const { run } = useAktion();
  const opts: [string, string][] = ours ? [['open', 'offen'], ['in_progress', 'in Arbeit'], ['done', 'erledigt']] : [['open', 'offen'], ['done', 'erledigt']];
  const typ = { open: 'task.reopen', in_progress: 'task.start', done: 'task.complete' } as const;
  return (
    <select className="fe" value={status} aria-label="Verschieben nach" onChange={(e) => {
      const v = e.target.value as keyof typeof typ;
      void run(typ[v], { id }, v === 'done' ? 'Erledigt' : v === 'in_progress' ? 'In Arbeit' : 'Wieder offen');
    }}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Verantwortlich({ id, wert, team }: { id: string; wert: string; team: { id: string; name: string }[] }) {
  const { run } = useAktion();
  return (
    <select className="fe" value={wert} aria-label="zuständig" onChange={(e) => run('task.assign', { id, owner_user_id: e.target.value || null }, 'Zugewiesen')}>
      <option value="">niemand</option>
      {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}
