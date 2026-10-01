// Heute (§8.1, E39): always your items; below, "Im Team" with two kinds only.
import { currentUserId } from '@/auth';
import { Abschnitt, Aussage, Etikett, Hinweis, Leer } from '@/components/kg';
import { faellig, seit, tag, uhrzeit } from '@/lib/format';
import { navigation } from '@/lib/views/nav';
import { todayPage, type MatterItem, type TodayItem } from '@/lib/views/today';
import { HinweisAntworten, Uebergabe, ImTeam, Uebernehmen } from './client';

export const dynamic = 'force-dynamic';

const QUELLE: Record<string, string> = { mail: 'Mail', event: 'Termin', file: 'Datei', note: 'Notiz' };

function wo(i: { area: string | null; matter_id?: string | null; id?: string }, titel?: string) {
  return (
    <>
      {i.area ? <Etikett>{i.area}</Etikett> : <Etikett>ohne Bereich</Etikett>}
      {i.matter_id ? <a className="kg-bezug" href={`/m/${i.matter_id}`}>{titel ?? 'öffnen'}</a> : null}
    </>
  );
}

export default async function Heute({ searchParams }: { searchParams: Promise<{ bereich?: string }> }) {
  const { bereich } = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const [p, nav] = await Promise.all([todayPage(userId, now, bereich), navigation(userId)]);

  const chips = [{ key: '', label: 'Alle' }, ...nav.areas.map((a) => ({ key: a.key, label: a.name_plural }))];
  const termin = (i: TodayItem) => i.entry_id === i.id; // events carry their entry as id

  const zeile = (i: TodayItem, gruende: Parameters<typeof Hinweis>[0]['gruende']) => (
    <Hinweis key={i.id} zeit={termin(i) ? uhrzeit(i.at!) : i.at ? tag(i.at, now) : ''} titel={<strong>{i.title}</strong>}
      kontext={wo(i)} gruende={gruende} dringend={i.overdue} />
  );
  const matterZeile = (m: MatterItem, extra?: React.ReactNode) => (
    <Hinweis key={m.id} zeit={tag(m.last_activity, now)} titel={<strong>{m.title}</strong>}
      kontext={<><Etikett>{m.area}</Etikett><a className="kg-bezug" href={`/m/${m.id}`}>öffnen</a>{m.owner ? <span>· {m.owner}</span> : null}</>}
      gruende={[{ art: 'berechnet', text: m.reason }]} aktionen={extra} />
  );

  return (
    <main className="spalte">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="kg-sr">Heute</h1>
        <div className="mono">{new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' }).format(now)}</div>
        <div className="filterzeile" role="group" aria-label="Nach Bereich filtern">
          <span className="mono">Bereich</span>
          {chips.map((c) => (
            <a key={c.key} className="chip" role="button" aria-pressed={(bereich ?? '') === c.key} href={c.key ? `/heute?bereich=${c.key}` : '/heute'}>{c.label}</a>
          ))}
        </div>
      </div>

      {p.handoversToMe.length ? (
        <Abschnitt id="h-uebergabe" titel="Übergabe an dich" anzahl={p.handoversToMe.length}>
          {p.handoversToMe.map((m) => matterZeile({ ...m, reason: `${m.from ?? 'Jemand'} übergibt dir das – wartet auf deine Annahme` }, <Uebergabe matterId={m.id} />))}
        </Abschnitt>
      ) : null}

      {p.clarify.length ? (
        <Abschnitt id="h-klaeren" titel="Kurz klären" anzahl={p.clarify.length} aside="ich bin unsicher, wohin das gehört">
          {p.clarify.map((h) => (
            <div key={h.id} className="kg-klaerung">
              <div className="kg-klaerung-frage">{h.title}</div>
              {h.reason ? <Aussage art="einschaetzung" quelle={h.source ? `${QUELLE[h.source.kind] ?? 'Eintrag'} ${tag(h.source.at, now)}` : undefined}>{h.reason}</Aussage> : null}
              <HinweisAntworten hintId={h.id} optionen={h.options.map((o) => o.label)} />
            </div>
          ))}
        </Abschnitt>
      ) : null}

      <Abschnitt id="h-heute" titel="Heute" anzahl={p.today.length} leer={<Leer titel="Heute steht nichts an." text="Termine und Fristen für heute erscheinen hier." />}>
        {p.today.map((i) =>
          termin(i)
            ? zeile(i, i.reason ? [{ art: 'belegt', text: i.reason, quelle: 'Kalender' }] : [])
            : zeile(i, [{ art: 'berechnet', text: i.overdue ? faellig(i.at!, now) : 'heute fällig', dringend: i.overdue }]),
        )}
      </Abschnitt>

      <Abschnitt id="h-wartet" titel="Wartet auf uns" anzahl={p.waitingOnUs.length} leer={<Leer titel="Nichts wartet auf euch." text="Wenn jemand eine Antwort von euch erwartet, steht es hier." />}>
        {p.waitingOnUs.map((i) => zeile(i, [
          { art: 'belegt', text: i.reason, quelle: `Mail ${tag(i.at!, now)}` },
          { art: 'berechnet', text: `${seit(i.at!, now)} keine Antwort` },
        ]))}
      </Abschnitt>

      <Abschnitt id="h-wir" titel="Wir warten auf" anzahl={p.weWaitFor.length} leer={<Leer titel="Ihr wartet auf nichts." text="Zusagen anderer mit Frist erscheinen hier." />}>
        {p.weWaitFor.map((i) => zeile(i, [
          { art: 'belegt', text: i.reason },
          ...(i.at ? [{ art: 'berechnet' as const, text: i.overdue ? faellig(i.at, now) : `bis ${tag(i.at, now)}`, dringend: i.overdue }] : []),
        ]))}
      </Abschnitt>

      <Abschnitt id="h-haengt" titel="Hängt" anzahl={p.stale.length} leer={<Leer titel="Nichts hängt." text="Einträge ohne Bewegung seit drei Wochen erscheinen hier." />}>
        {p.stale.map((m) => matterZeile(m))}
      </Abschnitt>

      <Abschnitt id="h-pruefen" titel="Prüfen" anzahl={p.reviewCounts.reduce((n, c) => n + c.n, 0)} aside="vom System angelegt, noch nicht übernommen" leer={<Leer titel="Alles geprüft." />}>
        {p.reviewCounts.map((c) => (
          <Hinweis key={c.key} zeit="Import" titel={<><strong>{c.n} ungeprüft</strong> in {c.label}</>}
            aktionen={<a className="kg-aktion kg-aktion--sekundaer" href={c.href}>{c.label} prüfen</a>} />
        ))}
      </Abschnitt>

      <ImTeam anzahl={p.team.unowned.length + p.team.stuckAtOthers.length}>
        <h3 className="label" style={{ margin: '8px 0 0', color: 'var(--ink-muted)' }}>Neu, niemand zuständig · {p.team.unowned.length}</h3>
        {p.team.unowned.map((m) => matterZeile(m, <Uebernehmen matterId={m.id} team={nav.team} me={userId} />))}
        <h3 className="label" style={{ margin: '16px 0 0', color: 'var(--ink-muted)' }}>Hängt oder überfällig bei anderen · {p.team.stuckAtOthers.length}</h3>
        {p.team.stuckAtOthers.map((m) => matterZeile(m))}
      </ImTeam>
    </main>
  );
}
