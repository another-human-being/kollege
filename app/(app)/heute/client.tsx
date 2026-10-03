'use client';
import { useState, type ReactNode } from 'react';
import { answer, hinweisText } from '@/app/actions';
import { Aktion } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';

/** buttons of a clarify hint – the answer runs as an action, with undo */
export function HinweisAntworten({ hintId, optionen }: { hintId: string; optionen: string[] }) {
  const { show } = useAktion();
  const [busy, setBusy] = useState(false);
  return (
    <div className="kg-aktionen">
      {optionen.map((o, i) => (
        <Aktion key={o} disabled={busy} onClick={async () => {
          setBusy(true);
          const redo = () => answer(hintId, i);
          show(await redo(), `Gemerkt: ${o}`, redo);
          setBusy(false);
        }}>{o}</Aktion>
      ))}
    </div>
  );
}

export function Uebergabe({ matterId }: { matterId: string }) {
  const { run } = useAktion();
  return (
    <>
      <Aktion onClick={() => run('matter.handover_accept', { id: matterId }, 'Übernommen')}>Übernehmen</Aktion>
      <Aktion variante="text" onClick={() => run('matter.handover_withdraw', { id: matterId }, 'Abgelehnt')}>Ablehnen</Aktion>
    </>
  );
}

/** nobody responsible yet: take it, or give it to someone (E45 allows this only while unowned) */
export function Uebernehmen({ matterId, team, me }: { matterId: string; team: { id: string; name: string }[]; me: string }) {
  const { run } = useAktion();
  const [wahl, setWahl] = useState(false);
  return (
    <>
      <Aktion onClick={() => run('matter.assign', { id: matterId, owner_user_id: me }, 'Du bist jetzt zuständig')}>Übernehmen</Aktion>
      {wahl ? (
        team.filter((u) => u.id !== me).map((u) => (
          <Aktion key={u.id} onClick={() => run('matter.assign', { id: matterId, owner_user_id: u.id }, `${u.name} ist jetzt zuständig`)}>{u.name}</Aktion>
        ))
      ) : (
        <Aktion variante="text" onClick={() => setWahl(true)}>Zuweisen an …</Aktion>
      )}
    </>
  );
}

export function ImTeam({ anzahl, children }: { anzahl: number; children: ReactNode }) {
  const [offen, setOffen] = useState(false);
  return (
    <section className="kg-abschnitt" aria-labelledby="h-team">
      <div className="kg-abschnitt-kopf">
        <h2 className="kg-abschnitt-titel" id="h-team">
          <button type="button" onClick={() => setOffen(!offen)} aria-expanded={offen} style={{ all: 'unset', cursor: 'pointer' }}>
            Im Team {offen ? '▴' : '▾'}
          </button>
        </h2>
        <span className="kg-abschnitt-zahl">{anzahl}</span>
        <span className="kg-abschnitt-aside">nur, was eine Handlung braucht: Neues ohne Zuständigkeit, Hängendes bei anderen</span>
      </div>
      {offen ? <div className="kg-abschnitt-liste">{children}</div> : null}
    </section>
  );
}

/** design Heute: "Später" puts an item off until tomorrow morning (hint.snooze, with undo) */
export function Spaeter({ hintId }: { hintId: string }) {
  const { run } = useAktion();
  return <Aktion variante="text" onClick={() => run('hint.snooze', { hint_id: hintId }, 'Verschoben auf morgen')}>Später</Aktion>;
}

export function Erledigt({ taskId }: { taskId: string }) {
  const { run } = useAktion();
  return <Aktion onClick={() => run('task.complete', { id: taskId }, 'Erledigt')}>Erledigt</Aktion>;
}

/** a moment answered in a few words: "Was kam raus?" → note, "Wie lief's?" → outcome note */
export function Festhalten({ hintId, label, optionen }: { hintId: string; label: string; optionen: string[] }) {
  const { show } = useAktion();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <textarea className="feld" rows={2} aria-label={label} placeholder="ein, zwei Sätze" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="kg-aktionen">
        <Aktion variante="primaer" disabled={busy || !text.trim()} onClick={async () => {
          setBusy(true);
          const redo = () => hinweisText(hintId, text);
          show(await redo(), 'Festgehalten', redo);
          setBusy(false);
        }}>Festhalten</Aktion>
        {optionen.map((o, i) => (
          <Aktion key={o} variante="text" disabled={busy} onClick={async () => {
            setBusy(true);
            const redo = () => answer(hintId, i);
            show(await redo(), o, redo);
            setBusy(false);
          }}>{o}</Aktion>
        ))}
        <Spaeter hintId={hintId} />
      </div>
    </div>
  );
}
