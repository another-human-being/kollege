'use client';
// Mail (E26, E38, E43). Writing: the draft saves itself while typing; "Senden" only by button,
// never by Enter; without recipient an error at the field, without subject or text a question.
// After "Senden" the mail waits 10 s and can be recalled – undo reopens the editor.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { anhangHochladen, entwurfFuer, mailSenden, perform } from '@/app/actions';
import { Aktion, Etikett } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';

type Anhang = { blob_path: string; filename: string; mime: string };
const liste = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

export function NeueMail() {
  const router = useRouter();
  const { show } = useAktion();
  return (
    <Aktion variante="primaer" onClick={async () => {
      const r = await entwurfFuer('neu');
      if (r.ok) router.push(`/mail?entwurf=${(r.result as { id: string }).id}`);
      else show(r, '', async () => r);
    }}>+ Neue Mail</Aktion>
  );
}

export function GelesenBeimOeffnen({ ids }: { ids: string[] }) {
  const router = useRouter();
  const done = useRef('');
  useEffect(() => {
    const key = ids.join(',');
    if (!ids.length || done.current === key) return;
    done.current = key;
    // reading is no change worth a toast; it goes back to the mailbox with the next sync
    void perform('mail.mark_read', { entry_ids: ids, seen: true }).then(() => router.refresh());
  }, [ids, router]);
  return null;
}

export function ThreadKopf({
  letzteId, eingangIds, bezuege, ziele,
}: {
  letzteId: string;
  eingangIds: string[];
  bezuege: { type: string; id: string; name: string; origin: string; link_id: string }[];
  ziele: { type: 'matter' | 'org'; id: string; name: string }[];
}) {
  const router = useRouter();
  const { run, show } = useAktion();
  const oeffne = async (art: 'antwort' | 'allen' | 'weiterleitung') => {
    const r = await entwurfFuer(art, letzteId);
    if (r.ok) router.push(`/mail?entwurf=${(r.result as { id: string }).id}`);
    else show(r, '', async () => r);
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
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
          if (type && id) void run('entry.link', { entry_id: letzteId, target_type: type, target_id: id }, 'Zugeordnet');
        }}>
          <option value="">+ zuordnen</option>
          {ziele.map((z) => <option key={`${z.type}:${z.id}`} value={`${z.type}:${z.id}`}>{z.name}</option>)}
        </select>
      </div>
      <div className="kg-aktionen">
        <Aktion onClick={() => oeffne('antwort')}>Antworten</Aktion>
        <Aktion onClick={() => oeffne('allen')}>Allen antworten</Aktion>
        <Aktion onClick={() => oeffne('weiterleitung')}>Weiterleiten</Aktion>
        {eingangIds.length ? <Aktion variante="text" onClick={() => run('mail.archive', { entry_ids: eingangIds }, 'Archiviert')}>Archivieren</Aktion> : null}
        <Aktion variante="text" onClick={() => run('mail.mark_read', { entry_ids: [letzteId], seen: false }, 'Als ungelesen markiert')}>Als ungelesen</Aktion>
      </div>
    </div>
  );
}

export interface SchreibfeldDaten {
  id: string;
  connection_id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  art: 'neu' | 'antwort' | 'weiterleitung';
  bezug_entry_id?: string;
  attachments: Anhang[];
  by_model: boolean;
  status: 'entwurf' | 'queued' | 'failed';
  fehler?: string;
}

export function Schreibfeld({ d, postfaecher, zurueck }: { d: SchreibfeldDaten; postfaecher: { id: string; label: string }[]; zurueck: string }) {
  const router = useRouter();
  const { run, show } = useAktion();
  const [v, setV] = useState({ ...d, to: d.to.join(', '), cc: d.cc.join(', '), bcc: d.bcc.join(', ') });
  const [gespeichert, setGespeichert] = useState<'ja' | 'speichert' | 'fehler'>('ja');
  const [fehlerAn, setFehlerAn] = useState(false);
  const [rueckfrage, setRueckfrage] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aktuell = useRef(v);
  aktuell.current = v;

  const payload = (x: typeof v) => ({
    id: d.id, connection_id: x.connection_id, to: liste(x.to), cc: liste(x.cc), bcc: liste(x.bcc), subject: x.subject, body: x.body,
    art: x.art, bezug_entry_id: x.bezug_entry_id, attachments: x.attachments,
  });
  async function speichern() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setGespeichert('speichert');
    const r = await perform('mail.draft', payload(aktuell.current));
    setGespeichert(r.ok ? 'ja' : 'fehler');
    return r;
  }
  function aendern(p: Partial<typeof v>) {
    setV((x) => ({ ...x, ...p }));
    setGespeichert('speichert');
    if (timer.current) clearTimeout(timer.current);
    // angefangene Mails werden automatisch als Entwurf gespeichert (E43)
    timer.current = setTimeout(() => void speichern(), 1000);
  }
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); void speichern(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function senden(trotzdem = false) {
    const x = aktuell.current;
    if (!liste(x.to).length && !liste(x.cc).length && !liste(x.bcc).length) { setFehlerAn(true); return; }
    if (!trotzdem && (!x.subject.trim() || !x.body.trim())) { setRueckfrage(true); return; }
    setLaeuft(true);
    const s = await speichern();
    if (!s.ok) { setLaeuft(false); show(s, '', async () => s); return; }
    const r = await mailSenden(d.id);
    setLaeuft(false);
    const an = [...liste(x.to), ...liste(x.cc)].join(', ');
    show(r, `Wird gesendet an ${an} – 10 s zurückholbar`, () => mailSenden(d.id), {
      ms: 10_000,
      // recalled: back into the editor (E43)
      nachher: () => router.push(`/mail?entwurf=${d.id}`),
    });
    if (r.ok) router.push(zurueck);
  }

  async function hochladen(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      const form = new FormData();
      form.set('datei', f);
      const r = await anhangHochladen(form);
      if (r.ok) aendern({ attachments: [...aktuell.current.attachments, r.anhang] });
      else show({ ok: false, error: r.error }, '', async () => ({ ok: false, error: r.error }));
    }
  }

  const absender = postfaecher.find((p) => p.id === v.connection_id)?.label ?? '';
  const titel = v.art === 'antwort' ? 'Antworten' : v.art === 'weiterleitung' ? 'Weiterleiten' : 'Neue Mail';
  return (
    <section className="schreibfeld" aria-label={titel}>
      <div className="ld-kopfzeile"><h2 style={{ margin: 0 }}>{titel}</h2>{d.by_model ? <Etikett>Entwurf von Kollege</Etikett> : null}
        <span style={{ flexGrow: 1 }} /><span className="mono" aria-live="polite">{gespeichert === 'ja' ? 'Entwurf gespeichert' : gespeichert === 'speichert' ? 'speichert …' : 'nicht gespeichert'}</span></div>
      {d.status === 'failed' ? <div role="alert" className="mono" style={{ color: 'var(--attention)' }}>Senden fehlgeschlagen: {d.fehler}</div> : null}
      {d.status === 'queued' ? <div role="status" className="mono">Wird gerade gesendet.</div> : null}
      <div className="felder">
        {postfaecher.length > 1 ? (
          <>
            <label htmlFor="m-von">Von</label>
            <select id="m-von" value={v.connection_id} onChange={(e) => aendern({ connection_id: e.target.value })}>
              {postfaecher.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </>
        ) : null}
        <label htmlFor="m-an">An</label>
        <div>
          <input id="m-an" className="feld" value={v.to} aria-invalid={fehlerAn} aria-describedby={fehlerAn ? 'm-an-fehler' : undefined}
            onChange={(e) => { setFehlerAn(false); aendern({ to: e.target.value }); }} />
          {fehlerAn ? <div id="m-an-fehler" role="alert" className="mono" style={{ color: 'var(--attention)' }}>Empfänger fehlt – an wen soll die Mail gehen?</div> : null}
        </div>
        <label htmlFor="m-cc">CC</label>
        <input id="m-cc" className="feld" value={v.cc} onChange={(e) => aendern({ cc: e.target.value })} />
        <label htmlFor="m-bcc">BCC</label>
        <input id="m-bcc" className="feld" value={v.bcc} onChange={(e) => aendern({ bcc: e.target.value })} />
        <label htmlFor="m-betreff">Betreff</label>
        <input id="m-betreff" className="feld" value={v.subject} onChange={(e) => aendern({ subject: e.target.value })} />
      </div>
      <label htmlFor="m-text" className="kg-sr">Text</label>
      <textarea id="m-text" className="feld schreibfeld-text" value={v.body} rows={14} onChange={(e) => aendern({ body: e.target.value })} />
      {v.attachments.length ? (
        <ul className="anhaenge">
          {v.attachments.map((a, i) => (
            <li key={`${a.blob_path}-${i}`}><span>{a.filename}</span>
              <button type="button" className="kg-aktion kg-aktion--text" onClick={() => aendern({ attachments: v.attachments.filter((_, j) => j !== i) })}>Entfernen</button></li>
          ))}
        </ul>
      ) : null}
      {rueckfrage ? (
        <div role="alert" className="kg-klaerung">
          <div className="kg-klaerung-frage">{!v.subject.trim() ? 'Die Mail hat keinen Betreff.' : 'Die Mail hat keinen Text.'} Trotzdem senden?</div>
          <div className="kg-aktionen">
            <Aktion onClick={() => { setRueckfrage(false); void senden(true); }}>Trotzdem senden</Aktion>
            <Aktion variante="text" onClick={() => setRueckfrage(false)}>Zurück zum Text</Aktion>
          </div>
        </div>
      ) : null}
      <div className="kg-aktionen">
        <Aktion variante="primaer" onClick={() => void senden()} disabled={laeuft || d.status === 'queued'}>Über mein Postfach senden</Aktion>
        <label className="kg-aktion kg-aktion--sekundaer" style={{ cursor: 'pointer' }}>
          + Anhang<input type="file" multiple hidden onChange={(e) => void hochladen(e.target.files)} />
        </label>
        <Aktion variante="text" onClick={async () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          const r = await run('mail.draft_delete', { id: d.id }, 'Entwurf verworfen');
          if (r.ok) router.push(zurueck);
        }}>Verwerfen</Aktion>
      </div>
      <div className="mono" style={{ color: 'var(--ink-muted)' }}>geht über {absender} · 10 s lang zurückholbar</div>
    </section>
  );
}
