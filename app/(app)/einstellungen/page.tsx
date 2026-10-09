// Einstellungen (§11): Quellen, Bereiche, Anweisungen. Connecting sources comes with stage 4;
// instructions are created through the input field (chat, stage 3) and edited here.
import { currentUserId } from '@/auth';
import { Feld, NeuAnlegen, Tu } from '@/components/bearbeiten';
import { Abschnitt, Anweisung, Leer } from '@/components/kg';
import { zeitpunkt } from '@/lib/format';
import { benachrichtigungen } from '@/lib/views/push';
import { settings } from '@/lib/views/settings';
import { PushGeraet } from '@/components/push';
import { BereichFelder, Phasen } from './client';

export const dynamic = 'force-dynamic';

const REITER = ['Quellen', 'Bereiche', 'Anweisungen', 'Benachrichtigungen'] as const;
const QUELLE: Record<string, string> = { mail: 'Postfach', calendar: 'Kalender', drive: 'Laufwerk' };

export default async function Einstellungen({ searchParams }: { searchParams: Promise<{ reiter?: string; id?: string }> }) {
  const sp = await searchParams;
  const reiter = REITER.find((r) => r === sp.reiter) ?? 'Quellen';
  const userId = await currentUserId();
  const now = new Date();
  const s = await settings(userId);
  const push = reiter === 'Benachrichtigungen' ? await benachrichtigungen(userId) : null;
  const area = reiter === 'Bereiche' ? (s.areas.find((a) => a.id === sp.id) ?? s.areas[0]) : null;

  return (
    <main className="spalte">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 500 }}>Einstellungen</h1>
        <div className="kg-umschalter" role="tablist" aria-label="Reiter" style={{ alignSelf: 'flex-start' }}>
          {REITER.map((r) => (
            <a key={r} role="tab" aria-selected={r === reiter} href={`/einstellungen?reiter=${r}`}
              style={{ fontSize: 13, lineHeight: '20px', padding: '2px 10px', borderRadius: 1, textDecoration: 'none',
                color: r === reiter ? 'var(--paper)' : 'var(--ink-muted)', background: r === reiter ? 'var(--ink)' : 'transparent' }}>{r}</a>
          ))}
        </div>
      </div>

      {reiter === 'Quellen' ? (
        <Abschnitt id="e-quellen" titel="Quellen" anzahl={s.sources.length} aside="eigene und Team-Quellen">
          {s.sources.map((q) => (
            <div key={q.id} className="gz">
              <span className="mono">{QUELLE[q.kind] ?? q.kind}</span>
              <div>
                <div>{q.label} {q.team ? <span className="mono">· Team</span> : null}</div>
                <div className="mono">
                  {q.status === 'ok' ? 'verbunden' : q.status === 'error' ? 'Fehler' : 'aus'}
                  {q.last_sync_at ? ` · zuletzt ${zeitpunkt(q.last_sync_at, now)}` : ' · noch nie gelesen'}
                  {q.provider === 'fixture' ? ' · Testdaten' : ''}
                </div>
                {q.last_error ? <div className="fehler">{q.last_error}</div> : null}
              </div>
            </div>
          ))}
        </Abschnitt>
      ) : null}

      {reiter === 'Bereiche' && area ? (
        <>
          <div className="filterzeile" role="group" aria-label="Bereich wählen">
            {s.areas.map((a) => <a key={a.id} className="chip" role="button" aria-pressed={a.id === area.id} href={`/einstellungen?reiter=Bereiche&id=${a.id}`}>{a.name_plural}</a>)}
            <NeuAnlegen label="+ Bereich" oeffnen="/einstellungen?reiter=Bereiche&id="
              ziel={{ type: 'area.create', base: { matter_kind: 'item', fields: [], phases: [], actions: ['new'], sort: s.areas.length }, key: 'name_plural' }} />
          </div>
          <Abschnitt id="e-bereich" titel={area.name_plural}>
            <div className="felder">
              <label htmlFor="a-plural">Name (Liste)</label>
              <Feld id="a-plural" wert={area.name_plural} label="Name (Liste)" change={{ type: 'area.update', base: { id: area.id }, key: 'name_plural' }} />
              <label htmlFor="a-singular">Name (ein Eintrag)</label>
              <Feld id="a-singular" wert={area.name_singular} label="Name (ein Eintrag)" change={{ type: 'area.update', base: { id: area.id }, key: 'name_singular' }} />
              <label htmlFor="a-beschr">Was gehört hierher</label>
              <Feld id="a-beschr" mehrzeilig wert={area.description} label="Was gehört hierher" change={{ type: 'area.update', base: { id: area.id }, key: 'description' }} />
              <span className="fl">Phasen</span>
              <Phasen id={area.id} phasen={area.phases} />
            </div>
            <p className="mono">Die Beschreibung liest Kollege, wenn er Mails und Termine zuordnet.</p>
          </Abschnitt>
          <Abschnitt id="e-felder" titel="Spalten" anzahl={area.fields.length} aside="höchstens 5">
            <BereichFelder id={area.id} felder={area.fields} />
          </Abschnitt>
        </>
      ) : null}

      {push ? (
        <>
          <Abschnitt id="e-push" titel="Benachrichtigungen" aside="werktags 7 bis 20 Uhr">
            <p style={{ margin: 0 }}>
              Kollege meldet sich auf deinen Geräten, wenn ein Hinweis für dich neu ist – als Mitteilung, nicht als Mail.
              Sie sagt in einer Zeile, worum es geht; Tippen öffnet die Stelle in Kollege, an der die Einzelheiten stehen (die Mail, das Thema, die Aufgabe).
              Was nachts oder am Wochenende aufkommt, kommt am nächsten Werktag um 7 Uhr. Welche Hinweise kommen, regelst du mit Anweisungen.
            </p>
            {push.schluessel ? <PushGeraet schluessel={push.schluessel} />
              : <p className="mono">Auf diesem Server sind Benachrichtigungen noch nicht eingerichtet (VAPID-Schlüssel fehlen).</p>}
          </Abschnitt>
          <Abschnitt id="e-geraete" titel="Deine Geräte" anzahl={push.geraete.length}
            leer={<Leer titel="Noch kein Gerät." text="Auf jedem Gerät, das Hinweise bekommen soll, hier einschalten." />}>
            {push.geraete.map((g) => (
              <div key={g.id} className="gz">
                <span className="mono">seit {zeitpunkt(g.seit, now)}</span>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{g.label}</span>
                  <Tu type="push.unsubscribe" payload={{ id: g.id }} text="Gerät entfernt" variante="text">Entfernen</Tu>
                </div>
              </div>
            ))}
          </Abschnitt>
        </>
      ) : null}

      {reiter === 'Anweisungen' ? (
        <Abschnitt id="e-anw" titel="Anweisungen" anzahl={s.instructions.length} aside="persönlich vor Bereich vor Team"
          leer={<Leer titel="Noch keine Anweisungen." text="Anweisungen gibst du im Eingabefeld in eigenen Worten, z. B. „Rechnungen sind keine Gründungsteams“." />}>
          {s.instructions.map((a) => (
            <Anweisung key={a.id} geltung={a.scope === 'Bereich' ? `Bereich ${a.area}` : a.scope}
              aktionen={<Tu type="instruction.delete" payload={{ id: a.id }} text="Anweisung gelöscht" variante="text">Löschen</Tu>}>
              <Feld id={`i-${a.id}`} wert={a.text} label="Anweisung" change={{ type: 'instruction.update', base: { id: a.id }, key: 'body_text' }} breite={520} />
              {a.hinweise ? <div className="mono" style={{ color: 'var(--ink-muted)' }}>{a.hinweise}</div> : null}
            </Anweisung>
          ))}
        </Abschnitt>
      ) : null}
    </main>
  );
}
