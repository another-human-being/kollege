// Aufgaben (E44): list grouped by due date or board Offen · In Arbeit · Wartet auf andere · Erledigt.
// New tasks come through the one input field (chat, stage 3) – §11.
import { currentUserId } from '@/auth';
import { Feld } from '@/components/bearbeiten';
import { Etikett, Leer, Privat, Quelle } from '@/components/kg';
import { faellig, tag } from '@/lib/format';
import { berlinDate } from '@/lib/time';
import { navigation } from '@/lib/views/nav';
import { taskList, type TaskRow } from '@/lib/views/tasks';
import { StatusWahl, Verantwortlich } from './client';

export const dynamic = 'force-dynamic';

type Search = { ansicht?: string; richtung?: string; wer?: string; status?: string; id?: string };

const STATUS = { open: 'offen', in_progress: 'in Arbeit', done: 'erledigt' } as const;

function gruppe(t: TaskRow, now: Date): string {
  if (!t.due_at) return 'Ohne Datum';
  if (t.overdue) return 'Überfällig';
  const d = Math.round((Date.parse(`${berlinDate(new Date(t.due_at))}T12:00:00Z`) - Date.parse(`${berlinDate(now)}T12:00:00Z`)) / 86_400_000);
  return d === 0 ? 'Heute' : d < 7 ? 'Diese Woche' : 'Später';
}
const REIHE = ['Überfällig', 'Heute', 'Diese Woche', 'Später', 'Ohne Datum'];

export default async function Aufgaben({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const board = sp.ansicht === 'board';
  const [rows, nav] = await Promise.all([
    taskList(userId, {
      direction: sp.richtung === 'uns' ? 'ours' : sp.richtung === 'an' ? 'theirs' : undefined,
      scope: sp.wer === 'team' ? 'team' : 'mine',
      status: board ? 'board' : sp.status === 'erledigt' ? 'done' : 'open',
    }, now),
    navigation(userId),
  ]);
  const url = (patch: Partial<Search>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/aufgaben${s.size ? `?${s}` : ''}`;
  };
  const chip = (label: string, patch: Partial<Search>, an: boolean) => <a key={label} className="chip" role="button" aria-pressed={an} href={url(patch)}>{label}</a>;
  const sel = rows.find((t) => t.id === sp.id) ?? null;

  const karte = (t: TaskRow) => (
    <a key={t.id} className="tz" href={url({ id: t.id })} aria-current={t.id === sp.id ? 'true' : undefined}
      style={{ gridTemplateColumns: 'minmax(0,1fr)', rowGap: 2 }}>
      <span className="t1" style={{ whiteSpace: 'normal' }}>{t.private ? <><Privat nurSymbol /> </> : null}{t.title}</span>
      {t.due_at ? <span className={t.overdue ? 'tm ta' : 'tm'}>{faellig(t.due_at, now)}</span> : null}
      <span className="tm">
        {t.direction === 'ours' ? `von uns · ${t.owner ?? 'niemand'}` : `an uns · ${t.owner ?? '–'}`}
        {t.status === 'in_progress' ? ' · in Arbeit' : ''}{t.matter ? ` · ${t.matter.title}` : ''}
      </span>
    </a>
  );

  const spalten: [string, TaskRow[]][] = [
    ['Offen', rows.filter((t) => t.direction === 'ours' && t.status === 'open')],
    ['In Arbeit', rows.filter((t) => t.status === 'in_progress')],
    ['Wartet auf andere', rows.filter((t) => t.direction === 'theirs' && t.status !== 'done')],
    ['Erledigt', rows.filter((t) => t.status === 'done')],
  ];

  return (
    <div className={sel ? 'ld' : 'ld ld--zu'}>
      <div className="ld-liste">
        <div className="ld-kopf">
          <div className="ld-kopfzeile">
            <h1>Aufgaben</h1>
            <span className="mono">{rows.length}</span>
            <span style={{ flexGrow: 1 }} />
            <div className="filterzeile" role="group" aria-label="Ansicht">
              {chip('Liste', { ansicht: undefined }, !board)}
              {chip('Board', { ansicht: 'board' }, board)}
            </div>
          </div>
          <div className="filterzeile" role="group" aria-label="Filter">
            {chip('alle', { richtung: undefined }, !sp.richtung)}
            {chip('von uns', { richtung: 'uns' }, sp.richtung === 'uns')}
            {chip('an uns', { richtung: 'an' }, sp.richtung === 'an')}
            <span className="mono" style={{ marginLeft: 8 }}>wer</span>
            {chip('meine', { wer: undefined }, sp.wer !== 'team')}
            {chip('Team', { wer: 'team' }, sp.wer === 'team')}
            {!board ? <><span className="mono" style={{ marginLeft: 8 }}>status</span>{chip('offen', { status: undefined }, sp.status !== 'erledigt')}{chip('erledigt', { status: 'erledigt' }, sp.status === 'erledigt')}</> : null}
          </div>
        </div>
        <div className="ld-scroll">
          {board ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {spalten.map(([titel, xs]) => (
                <section key={titel} aria-label={titel} style={{ borderRight: '1px solid var(--rule)' }}>
                  <div className="ld-gruppe">{titel} · {xs.length}{titel === 'Erledigt' ? ' (14 Tage)' : ''}</div>
                  {xs.map(karte)}
                </section>
              ))}
            </div>
          ) : (
            sp.status === 'erledigt'
              ? rows.map(karte)
              : REIHE.map((g) => {
                  const xs = rows.filter((t) => gruppe(t, now) === g);
                  return xs.length ? <div key={g}><div className="ld-gruppe">{g} · {xs.length}</div>{xs.map(karte)}</div> : null;
                })
          )}
          {!rows.length ? <div style={{ padding: 20 }}><Leer titel="Keine Aufgaben in dieser Ansicht." text="Neue Aufgaben entstehen, wenn du im Eingabefeld etwas notierst – oder Kollege sie aus Mails und Terminen erkennt." /></div> : null}
        </div>
      </div>
      {sel ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="x-knopf" href={url({ id: undefined })} aria-label="Detailansicht schließen">×</a></div>
          <div className="label" style={{ color: 'var(--ink-muted)' }}>{sel.direction === 'ours' ? 'Aufgabe · von uns' : 'Zusage · an uns'} · {STATUS[sel.status]}</div>
          <Feld id="t-titel" gross wert={sel.title} label="Titel" change={{ type: 'task.update', base: { id: sel.id }, key: 'title' }} />
          <div className="felder">
            <label htmlFor="t-faellig">fällig</label>
            <div className="feldzeile">
              <Feld id="t-faellig" art="date" wert={sel.due_at ? berlinDate(new Date(sel.due_at)) : ''} label="fällig"
                change={{ type: 'task.update', base: { id: sel.id }, key: 'due_date' }} />
              {sel.overdue ? <span className="mono ta" style={{ color: 'var(--attention)' }}>= {faellig(sel.due_at!, now)}</span> : null}
            </div>
            <span className="fl">{sel.direction === 'ours' ? 'zuständig' : 'schuldet uns'}</span>
            <div className="feldzeile">
              {sel.direction === 'ours'
                ? <Verantwortlich id={sel.id} wert={sel.owner_user_id ?? ''} team={nav.team} />
                : <span style={{ fontSize: 14, lineHeight: '28px' }}>{sel.owner ?? '–'}</span>}
            </div>
            <span className="fl">Status</span>
            <div className="feldzeile"><StatusWahl id={sel.id} status={sel.status} ours={sel.direction === 'ours'} /></div>
            {sel.matter ? <><span className="fl">gehört zu</span><div className="feldzeile"><Etikett>{sel.matter.area}</Etikett><a className="kg-bezug" href={`/m/${sel.matter.id}`}>{sel.matter.title}</a></div></> : null}
            {sel.source ? (
              <>
                <span className="fl">Quelle</span>
                <div className="feldzeile" style={{ fontSize: 14 }}>
                  {sel.source.readable ? <Quelle>{sel.source.title ?? 'Eintrag'}</Quelle> : <><Privat nurSymbol fuer={sel.source.owners.join(', ')} /> aus {sel.source.owners.join(', ')}s Mail</>}
                </div>
              </>
            ) : null}
            {sel.done_at ? <><span className="fl">erledigt</span><span className="mono" style={{ lineHeight: '28px' }}>{tag(sel.done_at, now)}</span></> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

