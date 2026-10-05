// Heute (E56, E57): a sentence as head, "Diese Woche", "Offen" in Entscheiden and Erledigen,
// "Ausstehend" with expected-by and Wiedervorlage. The big input moved into the sidebar field
// (E55); on a phone it stays at the bottom of Heute (design "Mobil").
import { currentUserId } from '@/auth';
import { EingabeStart } from '@/components/chat';
import { Icon } from '@/components/icon';
import { heute, type Punkt } from '@/lib/views/heute';
import { navigation } from '@/lib/views/nav';
import { PunktZeile } from './punkt';

export const dynamic = 'force-dynamic';

const kw = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
};

export default async function Heute() {
  const userId = await currentUserId();
  const now = new Date();
  const [h, nav] = await Promise.all([heute(userId, now), navigation(userId)]);
  const zeilen = (xs: Punkt[], spalten?: boolean) => xs.map((p) => <PunktZeile key={p.key} p={p} team={nav.team} me={userId} spalten={spalten} />);
  const spaltenBreite = h.woche.map((d) => (d.heute ? '1.35fr' : d.ende ? '.75fr' : '1fr')).join(' ');

  return (
    <main className="hx">
      <header className="hx-kopf">
        <h1 className="hx-h1">Heute</h1>
        <span className="hx-dat">{h.kopf.datum} · KW {kw(now)}</span>
      </header>
      <p className="hx-satz">
        <b>{h.kopf.termine === 1 ? '1 Termin' : `${h.kopf.termine} Termine`}</b> · <b>{h.kopf.offen} offen</b>
        {h.kopf.ueber ? <>, davon <span className="hx-ue">{h.kopf.ueber} überfällig</span></> : null} · {h.kopf.ausstehend} ausstehend
      </p>
      <div className="heute-eingabe"><EingabeStart /></div>

      <section className="hx-ab" aria-labelledby="h-woche">
        <div className="hx-sk"><Icon name="kalender" /><h2 id="h-woche">Diese Woche</h2><a className="hx-rechts" href="/kalender">KW {kw(now)} · Kalender →</a></div>
        <div className="hx-wk" style={{ gridTemplateColumns: spaltenBreite }}>
          {h.woche.map((d) => (
            <div key={d.datum} className={`hx-wd${d.heute ? ' hx-wd--heute' : ''}${d.ende ? ' hx-wd--ende' : ''}`}>
              <div className="hx-wd-k"><b>{d.tag}</b><span>{d.datum}</span><span className="hx-n">{d.termine.length ? `${d.termine.length} ${d.termine.length === 1 ? 'Termin' : 'Termine'}` : ''}</span></div>
              <div className="hx-wd-l">
                {(() => {
                  const out: React.ReactNode[] = [];
                  let jetztGezeigt = false;
                  for (const t of d.termine) {
                    if (d.jetzt && !jetztGezeigt && !t.vorbei) { out.push(<div key="jetzt" className="hx-jetzt">jetzt {d.jetzt}</div>); jetztGezeigt = true; }
                    out.push(
                      <a key={t.key} className={t.vorbei ? 'hx-we hx-we--vorbei' : 'hx-we'} href={`/kalender?t=${t.id}&s=${encodeURIComponent(t.start)}`} title={[t.title, t.location].filter(Boolean).join(' · ')}>
                        <span className="hx-z2">{t.allDay ? 'ganzt.' : new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(t.start))}</span>
                        <span>{t.title}</span>
                      </a>,
                    );
                  }
                  if (d.jetzt && !jetztGezeigt) out.push(<div key="jetzt" className="hx-jetzt">jetzt {d.jetzt}</div>);
                  if (!d.termine.length) out.push(<span key="frei" className="hx-frei">keine Termine</span>);
                  return out;
                })()}
              </div>
              {d.fristen.length ? (
                <div className="hx-wf">
                  {d.fristen.map((f, i) => (
                    <div key={i} className={f.mein ? 'hx-wfi hx-wfi--mein' : 'hx-wfi'}>
                      <Icon name={f.mein ? 'gefunden' : 'sanduhr'} className="hx-ic" /><span>{f.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="hx-ab" aria-labelledby="h-offen">
        <div className="hx-sk"><Icon name="aufgaben" /><h2 id="h-offen">Offen</h2><span className="hx-zahl">{h.kopf.offen}</span><a className="hx-rechts" href="/aufgaben">Alle in Aufgaben →</a></div>
        <div className="hx-zwei">
          <div aria-labelledby="h-entscheiden" role="group">
            <div className="hx-sub" id="h-entscheiden">Entscheiden <span className="hx-n">{h.entscheiden.length}</span><span className="hx-hint">je ein Klick, Kollege hat vorbereitet</span></div>
            {h.entscheiden.length ? zeilen(h.entscheiden) : <p className="hx-leer">Nichts zu entscheiden.</p>}
          </div>
          <div aria-labelledby="h-erledigen" role="group">
            <div className="hx-sub" id="h-erledigen">Erledigen <span className="hx-n">{h.erledigen.length}</span></div>
            {h.erledigen.length ? zeilen(h.erledigen) : <p className="hx-leer">Für diese Woche ist nichts mehr zu erledigen.</p>}
          </div>
        </div>
      </section>

      <section className="hx-ab" aria-labelledby="h-ausstehend">
        <div className="hx-sk"><Icon name="sanduhr" /><h2 id="h-ausstehend">Ausstehend</h2><span className="hx-zahl">{h.kopf.ausstehend}</span><a className="hx-rechts" href="/aufgaben?richtung=an">Alle in Aufgaben →</a></div>
        {h.ausstehend.length ? (
          <>
            <div className="hx-au-k" aria-hidden="true"><span /><span>erwartet bis</span><span>Wiedervorlage</span></div>
            {zeilen(h.ausstehend, true)}
          </>
        ) : <p className="hx-leer">Du wartest auf nichts.</p>}
      </section>
    </main>
  );
}
