// Dateien (§11, stage 7): folders of the drive and files from mails; a file with path, download,
// "Gehört zu", what it is about (summary of the fast model) and its versions.
// Opening in Word directly is not possible from the browser (an SMB path) – "Pfad kopieren" instead.
import { currentUserId } from '@/auth';
import { PfadKopieren } from '@/components/dateien';
import { Abschnitt, Etikett, Leer } from '@/components/kg';
import { Zuordnung } from '@/components/zuordnung';
import { tag, zeitpunkt } from '@/lib/format';
import { datei, dateiListe, ordnerBaum, type DateiFilter } from '@/lib/views/dateien';
import { zuordnungsziele } from '@/lib/views/mail';

export const dynamic = 'force-dynamic';

type Search = { o?: string; f?: string; q?: string; d?: string; voll?: string };
const FILTER: [DateiFilter, string][] = [['zugeordnet', 'Zugeordnet'], ['ohne_zuordnung', 'Ohne Zuordnung']];

function groesse(n: number | null): string | null {
  if (n === null) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

export default async function Dateien({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const filter = FILTER.find(([k]) => k === sp.f)?.[0];
  const url = (patch: Partial<Search>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/dateien${s.size ? `?${s}` : ''}`;
  };
  const [baum, liste, d, ziele] = await Promise.all([
    ordnerBaum(userId),
    dateiListe(userId, { ordner: sp.o, filter, q: sp.q }),
    sp.d ? datei(userId, sp.d) : null,
    sp.d ? zuordnungsziele(userId) : [],
  ]);
  const ordnerName = sp.o === 'mail' ? 'Aus Mails' : sp.o ? sp.o.split('/').at(-1)! : 'Alle Dateien';

  return (
    <div className={d ? (sp.voll ? 'ld ld--voll' : 'ld') : 'ld ld--zu'}>
      <nav className="baum-spalte" aria-label="Ordner">
        <div className="mono" style={{ color: 'var(--ink-muted)' }}>Laufwerk</div>
        <div className="baum">
          <a href={url({ o: undefined, d: undefined })} aria-current={!sp.o ? 'true' : undefined}><span>Alle Dateien</span><span className="mono">{baum.alle}</span></a>
          {baum.ordner.map((o) => (
            <a key={o.pfad} href={url({ o: o.pfad, d: undefined })} aria-current={sp.o === o.pfad ? 'true' : undefined} style={{ paddingLeft: 8 + o.tiefe * 14 }}>
              <span>{o.name}</span><span className="mono">{o.anzahl}</span>
            </a>
          ))}
          {baum.mail ? <a href={url({ o: 'mail', d: undefined })} aria-current={sp.o === 'mail' ? 'true' : undefined}><span>Aus Mails</span><span className="mono">{baum.mail}</span></a> : null}
        </div>
      </nav>
      <div className="ld-liste">
        <div className="ld-kopf">
          <div className="ld-kopfzeile">
            <h1>{ordnerName}</h1>
            <span className="mono">{liste.length}</span>
          </div>
          <form action="/dateien" role="search">
            {Object.entries(sp).filter(([k, v]) => k !== 'q' && k !== 'd' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="such" name="q" defaultValue={sp.q ?? ''} placeholder="Dateien durchsuchen" aria-label="Dateien durchsuchen" />
          </form>
          <div className="filterzeile" role="group" aria-label="Filter">
            {FILTER.map(([k, l]) => <a key={k} className="chip" role="button" aria-pressed={filter === k} href={url({ f: filter === k ? undefined : k })}>{l}</a>)}
          </div>
        </div>
        <div className="ld-scroll">
          {liste.map((f) => (
            <a key={f.id} className="mz" href={url({ d: f.id })} aria-current={f.id === sp.d ? 'true' : undefined}>
              <span className="mz-von">{f.name}</span>
              <span className="mono mz-zeit">{tag(f.at, now)}</span>
              <span className="mono mz-meta">
                {[sp.o ? null : f.pfad ? f.pfad.split('/').slice(0, -1).join(' / ') || 'Laufwerk' : 'Aus Mails', f.bezug ?? 'nicht zugeordnet'].filter(Boolean).join(' · ')}
              </span>
            </a>
          ))}
          {!liste.length ? (
            <div style={{ padding: 20 }}>
              <Leer titel={baum.alle ? 'Keine Dateien in dieser Ansicht.' : 'Noch keine Dateien.'}
                text={baum.alle ? (sp.q || filter ? 'Ein Filter ist aktiv.' : undefined) : 'Das Laufwerk verbindet ihr mit npm run quelle:laufwerk; Anhänge aus Mails erscheinen von selbst.'} />
            </div>
          ) : null}
        </div>
      </div>

      {d ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="ld-wort" href={url({ voll: sp.voll ? undefined : '1' })}>{sp.voll ? 'Verkleinern' : 'Vollbild'}</a><a className="x-knopf" href={url({ d: undefined, voll: undefined })} aria-label="Schließen">×</a></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <h2 style={{ margin: 0, overflowWrap: 'anywhere' }}>{d.name}</h2>
            {d.pfad ? <div className="pfad">{d.netzpfad ?? d.pfad}</div> : null}
            {d.geloescht ? <div><Etikett>Auf dem Laufwerk gelöscht</Etikett></div> : null}
          </div>
          <div className="kg-aktionen">
            {d.herunterladbar ? <a className="kg-aktion kg-aktion--primaer" href={`/api/datei/${d.id}`}>Herunterladen</a> : null}
            {d.pfad ? <PfadKopieren pfad={d.netzpfad ?? d.pfad} /> : null}
          </div>
          {!d.herunterladbar && d.pfad ? <div className="mono" style={{ color: 'var(--ink-muted)' }}>Zu groß für Kollege – direkt auf dem Laufwerk öffnen.</div> : null}
          <div className="felder">
            {d.pfad ? <><span className="fl">Ordner</span><span>{d.pfad.split('/').slice(0, -1).join(' / ') || 'Laufwerk'}</span></> : null}
            {d.mail ? <><span className="fl">Aus Mail</span><span><a className="kg-bezug" href={d.mail.thread ? `/mail?t=${encodeURIComponent(d.mail.thread)}` : '/mail'}>{d.mail.betreff ?? '(ohne Betreff)'}</a>{d.mail.von ? ` · ${d.mail.von}` : ''}</span></> : null}
            <span className="fl">Geändert</span><span>{zeitpunkt(d.at, now)}{d.von ? ` · ${d.von}` : ''}</span>
            {groesse(d.size) ? <><span className="fl">Umfang</span><span>{groesse(d.size)}</span></> : null}
            <span className="fl">Sichtbar</span><span>{d.sichtbar}</span>
          </div>
          <Zuordnung entryId={d.id} bezuege={d.bezuege} ziele={ziele} />
          <Abschnitt id="d-worum" titel="Worum es geht">
            {d.summary ? <><div><Etikett>KI-Vermutung aus dem Dateiinhalt</Etikett></div><p style={{ margin: '8px 0 0' }}>{d.summary}</p></> : null}
            {d.text ? (
              <details>
                <summary className="mono">Textauszug</summary>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflowY: 'auto' }}>{d.text.slice(0, 5000)}</div>
              </details>
            ) : <div className="mono" style={{ color: 'var(--ink-muted)' }}>Kein Text lesbar – nur Name, Ordner und Datum.</div>}
          </Abschnitt>
          {d.versionen.length > 1 ? (
            <Abschnitt id="d-versionen" titel="Fassungen" anzahl={d.versionen.length}>
              {d.versionen.map((v) => (
                <div key={v.id} className="kal-person">
                  {v.id === d.id ? <span>{zeitpunkt(v.at, now)}</span> : <a className="kg-bezug" href={url({ d: v.id })}>{zeitpunkt(v.at, now)}</a>}
                  <span className="mono">{v.aktuell ? 'aktuell' : 'frühere Fassung'}</span>
                </div>
              ))}
            </Abschnitt>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
