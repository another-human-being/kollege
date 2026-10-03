'use client';
// Kalender (E41, E48): form for new and changed events, actions on an event. Invitations and
// changes to invited people go out only with "Einladung senden" / "Änderung senden" (E28),
// recallable for 10 s like mail (E43).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { terminSpeichern, terminVersand } from '@/app/actions';
import { Aktion } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';

const zeiten = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export interface FormDaten {
  id?: string;
  title: string;
  datum: string;
  von: string;
  bisDatum: string;
  bis: string;
  allDay: boolean;
  location: string;
  notes: string;
  mit: string;
}

export function TerminFormular({ d, zurueck }: { d: FormDaten; zurueck: string }) {
  const router = useRouter();
  const { show } = useAktion();
  const [v, setV] = useState(d);
  const [fehler, setFehler] = useState<string | null>(null);
  const set = (p: Partial<FormDaten>) => setV((x) => ({ ...x, ...p }));
  // Berlin local time as text: comparable without converting in the browser's time zone
  const endeVorBeginn = v.allDay ? v.bisDatum < v.datum : `${v.bisDatum}T${v.bis}` < `${v.datum}T${v.von}`;

  async function speichern() {
    if (!v.title.trim()) { setFehler('Der Termin braucht einen Titel.'); return; }
    if (endeVorBeginn) return;
    const r = await terminSpeichern(d.id, v);
    const mit = v.mit.includes('@');
    show(r, d.id ? 'Termin geändert' : mit ? 'Termin angelegt – Einladung noch nicht verschickt' : 'Termin angelegt', async () => r);
    if (r.ok) router.push(zurueck);
  }

  return (
    <section className="schreibfeld" aria-label={d.id ? 'Termin bearbeiten' : 'Neuer Termin'}>
      <h2 style={{ margin: 0 }}>{d.id ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
      <div className="felder">
        <label htmlFor="t-titel">Titel</label>
        <input id="t-titel" className="feld" value={v.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        <label htmlFor="t-ganz">Ganztägig</label>
        <input id="t-ganz" type="checkbox" checked={v.allDay} onChange={(e) => set({ allDay: e.target.checked })} style={{ justifySelf: 'start' }} />
        <label htmlFor="t-beginn">Beginn</label>
        <div className="feldzeile">
          <input id="t-beginn" type="date" className="feld" value={v.datum} onChange={(e) => set({ datum: e.target.value, bisDatum: e.target.value > v.bisDatum ? e.target.value : v.bisDatum })} />
          {v.allDay ? null : (
            <select aria-label="Beginn Uhrzeit" className="feld" value={v.von} onChange={(e) => set({ von: e.target.value })}>
              {zeiten.map((z) => <option key={z}>{z}</option>)}
            </select>
          )}
        </div>
        <label htmlFor="t-ende">Ende</label>
        <div>
          <div className="feldzeile">
            <input id="t-ende" type="date" className="feld" value={v.bisDatum} onChange={(e) => set({ bisDatum: e.target.value })} aria-invalid={endeVorBeginn} />
            {v.allDay ? null : (
              <select aria-label="Ende Uhrzeit" className="feld" value={v.bis} onChange={(e) => set({ bis: e.target.value })} aria-invalid={endeVorBeginn}>
                {zeiten.map((z) => <option key={z}>{z}</option>)}
              </select>
            )}
          </div>
          {endeVorBeginn ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>Das Ende liegt vor dem Beginn.</div> : null}
        </div>
        <label htmlFor="t-ort">Ort</label>
        <input id="t-ort" className="feld" value={v.location} onChange={(e) => set({ location: e.target.value })} />
        <label htmlFor="t-mit">Mit</label>
        <input id="t-mit" className="feld" value={v.mit} placeholder="Adressen, durch Komma getrennt" onChange={(e) => set({ mit: e.target.value })} />
        <label htmlFor="t-notiz">Notiz</label>
        <textarea id="t-notiz" className="feld" rows={4} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      {fehler ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>{fehler}</div> : null}
      <div className="kg-aktionen">
        <Aktion variante="primaer" onClick={() => void speichern()} disabled={endeVorBeginn}>{d.id ? 'Speichern' : 'Anlegen'}</Aktion>
        <a className="kg-aktion kg-aktion--text" href={zurueck}>Abbrechen</a>
      </div>
      <div className="mono" style={{ color: 'var(--ink-muted)' }}>
        Mit Teilnehmenden bleibt der Termin ein Entwurf, bis du „Einladung senden“ drückst. Ohne steht er gleich in deinem Kalender.
      </div>
    </section>
  );
}

export function TerminAktionen({ id, versand, kommend, hatEingeladene, zurueck }: { id: string; versand: string | null; kommend: boolean; hatEingeladene: boolean; zurueck: string }) {
  const router = useRouter();
  const { show } = useAktion();
  const versenden = async (type: 'event.send' | 'event.cancel', text: string) => {
    const r = await terminVersand(type, id);
    const raus = r.ok && (r.result as { art?: string } | undefined)?.art;
    show(r, raus ? `${text} – 10 s zurückholbar` : text, () => terminVersand(type, id), { ms: raus ? 10_000 : 9000, nachher: () => router.refresh() });
    if (r.ok && type === 'event.cancel') router.push(zurueck);
  };
  return (
    <div className="kg-aktionen">
      {versand === 'entwurf' ? <Aktion variante="primaer" onClick={() => versenden('event.send', 'Einladung wird gesendet')}>Einladung senden</Aktion> : null}
      {versand === 'aenderung_offen' ? <Aktion variante="primaer" onClick={() => versenden('event.send', 'Änderung wird gesendet')}>Änderung senden</Aktion> : null}
      {kommend ? (
        <Aktion variante="text" onClick={() => versenden('event.cancel', versand === 'entwurf' && !hatEingeladene ? 'Entwurf verworfen' : hatEingeladene ? 'Absage wird gesendet' : 'Termin abgesagt')}>
          {versand === 'entwurf' && !hatEingeladene ? 'Entwurf verwerfen' : 'Absagen'}
        </Aktion>
      ) : null}
    </div>
  );
}
