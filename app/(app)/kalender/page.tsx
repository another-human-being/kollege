// Kalender (§11.3, E41, E48): week with 7 columns (7–21 h or 0–24 h), all-day events in a bar,
// overlaps side by side, unsent ones dashed; month view; detail and form on the right.
import { currentUserId } from '@/auth';
import { Icon } from '@/components/icon';
import { TerminAktionen, TerminFormular, type FormDaten } from '@/components/kalender';
import { Aussage, Etikett, Leer, Umschalter } from '@/components/kg';
import { uhrzeit } from '@/lib/format';
import { addDays, berlinDate, berlinMinutes, berlinWeekStart } from '@/lib/time';
import { kalenderVerbunden, termine, type KalenderTermin } from '@/lib/views/kalender';

export const dynamic = 'force-dynamic';

type Search = { w?: string; m?: string; ansicht?: string; t?: string; s?: string; neu?: string; bearbeiten?: string; h?: string };
const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const TEILNAHME: Record<string, string> = { zugesagt: 'zugesagt', abgesagt: 'abgesagt', vorbehalt: 'mit Vorbehalt', offen: 'Antwort offen', nicht_eingeladen: 'nicht eingeladen' };
const PX = 0.8; // px per minute: 48 px per hour
const tagLabel = (d: string) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`)).replace(',', '');
const zustand = (t: KalenderTermin) => (t.versand === 'entwurf' ? 'Einladung nicht verschickt' : t.versand === 'aenderung_offen' ? 'Änderung nicht verschickt' : t.versand === 'sendet' ? 'wird gesendet' : null);

/** columns for overlapping events of one day (E48: side by side) */
function spuren(ts: KalenderTermin[]): Map<string, { spur: number; von: number }> {
  const out = new Map<string, { spur: number; von: number }>();
  const ende: number[] = [];
  let gruppe: string[] = [];
  let gruppenEnde = 0;
  const schliessen = () => { for (const k of gruppe) out.get(k)!.von = Math.max(ende.length, 1); gruppe = []; ende.length = 0; };
  for (const t of ts) {
    const s = new Date(t.start).getTime();
    const e = new Date(t.end).getTime();
    if (s >= gruppenEnde && gruppe.length) schliessen();
    let spur = ende.findIndex((x) => x <= s);
    if (spur < 0) { spur = ende.length; ende.push(e); } else ende[spur] = e;
    out.set(t.key, { spur, von: 1 });
    gruppe.push(t.key);
    gruppenEnde = Math.max(gruppenEnde, e);
  }
  schliessen();
  return out;
}

export default async function Kalender({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const monat = sp.ansicht === 'monat';
  const w = sp.w && /^\d{4}-\d{2}-\d{2}$/.test(sp.w) ? berlinWeekStart(new Date(`${sp.w}T12:00:00Z`)) : berlinWeekStart(now);
  const m = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : berlinDate(now).slice(0, 7);
  const tage = monat
    ? (() => { const first = berlinWeekStart(new Date(`${m}-01T12:00:00Z`)); return Array.from({ length: 42 }, (_, i) => addDays(first, i)); })()
    : Array.from({ length: 7 }, (_, i) => addDays(w, i));
  const von = new Date(`${addDays(tage[0]!, -1)}T00:00:00Z`);
  const bis = new Date(`${addDays(tage.at(-1)!, 2)}T00:00:00Z`);
  const [liste, verbunden] = await Promise.all([termine(userId, von, bis), kalenderVerbunden(userId)]);
  const imZeitraum = liste.filter((t) => berlinDate(new Date(t.end)) >= tage[0]! && berlinDate(new Date(t.start)) <= tage.at(-1)!);

  const url = (patch: Partial<Search>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/kalender${s.size ? `?${s}` : ''}`;
  };
  const voll = sp.h === '24';
  const [h0, h1] = voll ? [0, 24] : [7, 21];
  const zeitraum = monat
    ? new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-15T12:00:00Z`))
    : `${tagLabel(tage[0]!)} – ${tagLabel(tage[6]!)}`;
  const prev = monat ? { m: addDays(`${m}-01`, -1).slice(0, 7) } : { w: addDays(w, -7) };
  const next = monat ? { m: addDays(`${m}-28`, 7).slice(0, 7) } : { w: addDays(w, 7) };

  const offen = sp.t ? liste.find((t) => t.id === sp.t && (!sp.s || t.start === sp.s)) ?? liste.find((t) => t.id === sp.t) : null;
  const bearbeitet = sp.bearbeiten ? liste.find((t) => t.id === sp.bearbeiten && t.eigen) : null;
  // without a writable calendar there is no form to fill in only to fail at "Anlegen"
  const neu = verbunden && sp.neu && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sp.neu) ? sp.neu : null;
  const form: FormDaten | null = bearbeitet
    ? (() => {
        const s = new Date(bearbeitet.start); const e = new Date(bearbeitet.end);
        const lokal = (d: Date) => `${String(Math.floor(berlinMinutes(d) / 60)).padStart(2, '0')}:${String(berlinMinutes(d) % 60).padStart(2, '0')}`;
        return { id: bearbeitet.id, title: bearbeitet.title, datum: berlinDate(s), von: lokal(s), bisDatum: berlinDate(bearbeitet.allDay ? new Date(e.getTime() - 1) : e), bis: lokal(e),
          allDay: bearbeitet.allDay, location: bearbeitet.location ?? '', notes: bearbeitet.notes ?? '', mit: bearbeitet.teilnahme.map((t) => t.email).join(', ') };
      })()
    : neu
      ? (() => { const [d, z] = neu.split('T') as [string, string]; const h = Number(z.slice(0, 2)) + 1; const bisZ = h >= 24 ? '23:30' : `${String(h).padStart(2, '0')}:${z.slice(3)}`;
          return { title: '', datum: d, von: z, bisDatum: d, bis: bisZ, allDay: false, location: '', notes: '', mit: '' }; })()
      : null;
  const ausserhalb = !monat ? imZeitraum.filter((t) => !t.allDay && (berlinMinutes(new Date(t.start)) < h0 * 60 || berlinMinutes(new Date(t.end)) > h1 * 60 || berlinDate(new Date(t.end)) > berlinDate(new Date(t.start)))).length : 0;
  const detailOffen = Boolean(form || offen);
  const heute = berlinDate(now);

  return (
    <div className={detailOffen ? 'ld' : 'ld ld--zu'}>
      <div className="ld-liste ld-liste--breit kal">
        <div className="ld-kopf">
          <div className="ld-kopfzeile">
            <h1>Kalender</h1>
            <a className="kg-aktion kg-aktion--sekundaer" href={url(monat ? { m: undefined } : { w: undefined })}>Heute</a>
            <a className="kg-aktion kg-aktion--text" href={url(prev)} aria-label="Zurück">‹</a>
            <a className="kg-aktion kg-aktion--text" href={url(next)} aria-label="Weiter">›</a>
            <span className="mono">{zeitraum}</span>
            <span style={{ flexGrow: 1 }} />
            {verbunden ? <a className="kg-aktion kg-aktion--primaer" href={url({ neu: `${monat ? heute : (tage.includes(heute) ? heute : tage[0])}T09:00`, t: undefined, bearbeiten: undefined })}>+ Termin</a> : null}
          </div>
          <div className="filterzeile">
            <Umschalter label="Ansicht" optionen={[
              { label: 'Woche', href: url({ ansicht: undefined, m: undefined }), aktiv: !monat },
              { label: 'Monat', href: url({ ansicht: 'monat', w: undefined }), aktiv: monat },
            ]} />
            {!monat ? <a className="chip" role="button" aria-pressed={voll} href={url({ h: voll ? undefined : '24' })}>0–24 Uhr</a> : null}
            {ausserhalb && !voll ? <a className="mono" href={url({ h: '24' })}>{ausserhalb} außerhalb von {h0}–{h1} Uhr – anzeigen</a> : null}
          </div>
          {!verbunden ? <Leer titel="Anlegen geht erst mit einem Kalender, in den Kollege schreiben darf." text="Lesen klappt schon: Termine aus deinen Quellen, von anderen und aus Mails stehen hier. Zum Anlegen und Einladen den Kalender per CalDAV verbinden: npm run quelle:kalender (Apple: caldav.icloud.com mit app-spezifischem Passwort)." /> : null}
        </div>

        {monat ? (
          <div className="kal-monat">
            {WT.map((t) => <div key={t} className="kal-kopf mono">{t}</div>)}
            {tage.map((d) => {
              const ts = imZeitraum.filter((t) => berlinDate(new Date(t.start)) <= d && berlinDate(new Date(t.allDay ? new Date(t.end).getTime() - 1 : t.end)) >= d);
              return (
                <div key={d} className={`kal-tag${d.slice(0, 7) !== m ? ' kal-tag--fremd' : ''}${d === heute ? ' kal-tag--heute' : ''}`}>
                  <a className="mono" href={verbunden ? url({ neu: `${d}T09:00` }) : undefined} aria-label={`${tagLabel(d)}${verbunden ? ' – Termin anlegen' : ''}`}>{Number(d.slice(8))}</a>
                  {ts.slice(0, 4).map((t) => (
                    <a key={t.key} className={`kal-mini${zustand(t) ? ' kal-termin--offen' : ''}`} href={url({ t: t.id, s: t.start, neu: undefined, bearbeiten: undefined })}>
                      {t.allDay ? '' : `${uhrzeit(t.start)} `}{t.title}
                    </a>
                  ))}
                  {ts.length > 4 ? <span className="mono">+{ts.length - 4}</span> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="kal-woche" style={{ ['--h' as string]: `${(h1 - h0) * 60 * PX}px` }}>
            <div className="kal-ecke" />
            {tage.map((d, i) => <div key={d} className={`kal-kopf${i >= 5 ? ' kal-we' : ''}${d === heute ? ' kal-heute' : ''}`}>{tagLabel(d)}</div>)}
            <div className="kal-ecke mono">ganztägig</div>
            {tage.map((d, i) => (
              <div key={d} className={`kal-ganz${i >= 5 ? ' kal-we' : ''}`}>
                {imZeitraum.filter((t) => t.allDay && berlinDate(new Date(t.start)) <= d && berlinDate(new Date(new Date(t.end).getTime() - 1)) >= d).map((t) => (
                  <a key={t.key} className={`kal-mini${zustand(t) ? ' kal-termin--offen' : ''}`} href={url({ t: t.id, s: t.start, neu: undefined, bearbeiten: undefined })}>{t.title}</a>
                ))}
              </div>
            ))}
            <div className="kal-zeiten">
              {Array.from({ length: h1 - h0 }, (_, i) => <div key={i} className="mono" style={{ height: 60 * PX }}>{String(h0 + i).padStart(2, '0')}:00</div>)}
            </div>
            {tage.map((d, i) => {
              const ts = imZeitraum.filter((t) => !t.allDay && berlinDate(new Date(t.start)) === d);
              const sp2 = spuren(ts);
              return (
                <div key={d} className={`kal-spalte${i >= 5 ? ' kal-we' : ''}`}>
                  {verbunden ? Array.from({ length: (h1 - h0) * 2 }, (_, j) => {
                    const z = `${String(h0 + Math.floor(j / 2)).padStart(2, '0')}:${j % 2 ? '30' : '00'}`;
                    return <a key={j} className="kal-slot" style={{ top: j * 30 * PX, height: 30 * PX }} href={url({ neu: `${d}T${z}`, t: undefined, bearbeiten: undefined })} aria-label={`Termin am ${tagLabel(d)} um ${z} anlegen`} tabIndex={-1} />;
                  }) : null}
                  {ts.map((t) => {
                    const s = Math.max(berlinMinutes(new Date(t.start)), h0 * 60);
                    const e = berlinDate(new Date(t.end)) > d ? h1 * 60 : Math.min(berlinMinutes(new Date(t.end)), h1 * 60);
                    if (e <= h0 * 60 || s >= h1 * 60) return null;
                    const lane = sp2.get(t.key)!;
                    return (
                      <a key={t.key} href={url({ t: t.id, s: t.start, neu: undefined, bearbeiten: undefined })}
                        className={`kal-termin${zustand(t) ? ' kal-termin--offen' : ''}${t.eigen ? '' : ' kal-termin--fremd'}${sp.t === t.id ? ' kal-termin--aktiv' : ''}`}
                        style={{ top: (s - h0 * 60) * PX, height: Math.max((e - s) * PX, 18), left: `${(lane.spur / lane.von) * 100}%`, width: `${100 / lane.von}%` }}>
                        <span className="mono">{uhrzeit(t.start)}</span> {t.title}
                        {zustand(t) ? <span className="kg-sr"> – {zustand(t)}</span> : null}
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="x-knopf" href={url({ neu: undefined, bearbeiten: undefined })} aria-label="Schließen">×</a></div>
          <TerminFormular key={form.id ?? sp.neu} d={form} zurueck={url({ neu: undefined, bearbeiten: undefined, t: form.id })} />
        </div>
      ) : offen ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="x-knopf" href={url({ t: undefined, s: undefined })} aria-label="Schließen">×</a></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <h2 style={{ margin: 0, overflowWrap: 'anywhere' }}>{offen.title}</h2>
            {zustand(offen) ? <div><Etikett>{zustand(offen)}</Etikett></div> : null}
          </div>
          {offen.konflikt ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>{offen.konflikt}</div> : null}
          {offen.fehler ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>{offen.fehler}</div> : null}
          {/* E53: clusters – Wann · Wo · Wer · Gehört zu · Weitere Angaben (folded) */}
          <section className="cluster" aria-label="Wann">
            <h3 className="cluster-kopf"><Icon name="kalender" />Wann</h3>
            <span>{offen.allDay ? `${tagLabel(berlinDate(new Date(offen.start)))} · ganztägig` : `${tagLabel(berlinDate(new Date(offen.start)))} ${uhrzeit(offen.start)}–${uhrzeit(offen.end)}`}{offen.serie ? ' · wiederholt sich' : ''}</span>
          </section>
          {offen.location ? (
            <section className="cluster" aria-label="Wo">
              <h3 className="cluster-kopf"><Icon name="heute" />Wo</h3>
              <span>{offen.location}</span>
            </section>
          ) : null}
          {offen.teilnahme.length ? (
            <section className="cluster" aria-label="Wer">
              <h3 className="cluster-kopf"><Icon name="kontakte" />Wer <span className="mono">{offen.teilnahme.length}</span></h3>
              {offen.teilnahme.map((p) => (
                <div key={p.email} className="kal-person"><span>{p.name ?? p.email}</span><span className="mono">{TEILNAHME[p.status] ?? p.status}</span></div>
              ))}
            </section>
          ) : null}
          {offen.bezug ? (
            <section className="cluster" aria-label="Gehört zu">
              <h3 className="cluster-kopf"><Icon name="dateien" />Gehört zu</h3>
              <span>{offen.bezug}{offen.bezugHref ? <> · <a className="kg-bezug" href={offen.bezugHref}>Öffnen →</a></> : null}</span>
              {offen.rat ? <Aussage art="einschaetzung">Aus früheren Fällen: {offen.rat}</Aussage> : null}
            </section>
          ) : null}
          {offen.notes || (!offen.eigen && offen.besitzer.length) ? (
            <details className="cluster cluster--weiteres">
              <summary className="cluster-kopf">Weitere Angaben</summary>
              {!offen.eigen && offen.besitzer.length ? <span>Kalender von {offen.besitzer.join(', ')} – nur lesbar</span> : null}
              {offen.notes ? <div style={{ whiteSpace: 'pre-wrap' }}>{offen.notes}</div> : null}
            </details>
          ) : null}
          {offen.eigen ? (
            <>
              <TerminAktionen id={offen.id} versand={offen.versand} kommend={new Date(offen.end) > now}
                hatEingeladene={offen.teilnahme.some((p) => p.status !== 'nicht_eingeladen')} zurueck={url({ t: undefined, s: undefined })} />
              {!offen.serie && offen.versand !== 'sendet' ? <a className="kg-bezug" href={url({ bearbeiten: offen.id, t: undefined })}>Bearbeiten</a> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
