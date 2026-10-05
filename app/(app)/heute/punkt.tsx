'use client';
// One row of Heute (E56): icon or circle · sentence with a verb · from whom · reference as pill ·
// date on the right. Reasons and buttons only when opened.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { erinnerung } from '@/app/actions';
import { Icon, type IconName } from '@/components/icon';
import { Aktion, Aussage } from '@/components/kg';
import { useAktion } from '@/components/rueckgaengig';
import type { Punkt, PunktArt } from '@/lib/views/heute';
import { Festhalten, HinweisAntworten, Spaeter, Uebergabe, Uebernehmen } from './client';

const ICON: Partial<Record<PunktArt, IconName>> = {
  senden: 'senden', hand: 'hand', frage: 'frage', rat: 'rat', pruefen: 'aufgaben', ausstehend: 'sanduhr', nachfassen: 'sanduhr',
  antworten: 'mail', nachtragen: 'kalender', rueckblick: 'lesen', haengt: 'luecke',
};

export function PunktZeile({ p, team, me, spalten }: { p: Punkt; team: { id: string; name: string }[]; me: string; spalten?: boolean }) {
  const [auf, setAuf] = useState(false);
  const { run, show } = useAktion();
  const router = useRouter();
  const icon = ICON[p.art];
  return (
    <div className={auf ? 'hx-p hx-p--auf' : 'hx-p'}>
      <div className="hx-z">
        {p.kreis && p.taskId ? (
          <button type="button" className="hx-kreis" aria-label={`Erledigt: ${p.titel}`} title="Erledigt"
            onClick={() => run('task.complete', { id: p.taskId }, 'Erledigt')} />
        ) : icon ? <span className="hx-ik"><Icon name={icon} /></span> : <span className="hx-ik" />}
        <button type="button" className="hx-t" aria-expanded={auf} onClick={() => setAuf(!auf)}>
          <span className="hx-ti">{p.titel}</span>
          {p.von ? <span className="hx-von">{p.von}</span> : null}
          {p.bezug ? <span className="hx-bz">{p.bezug}</span> : null}
          {spalten ? (
            <><span className="hx-f">{p.bis}</span><span className={p.wvNah ? 'hx-f hx-f--b' : 'hx-f'}>{p.wv}</span></>
          ) : (
            <span className={p.fArt === 'ue' ? 'hx-f hx-f--ue' : p.fArt === 'h' ? 'hx-f hx-f--h' : 'hx-f'}>{p.f}</span>
          )}
        </button>
      </div>
      {auf ? (
        <div className="hx-d">
          {p.gruende.map((g, i) => <Aussage key={i} art={g.art} quelle={g.quelle} dringend={g.dringend}>{g.text}</Aussage>)}
          {p.festhalten && p.hintId ? (
            <Festhalten hintId={p.hintId} label={p.titel} optionen={p.optionen ?? []} />
          ) : (
            <div className="kg-aktionen">
              {p.optionen?.length && p.hintId ? <HinweisAntworten hintId={p.hintId} optionen={p.optionen} /> : null}
              {p.art === 'hand' && p.key.startsWith('u:') && p.matterId ? <Uebergabe matterId={p.matterId} /> : null}
              {p.art === 'hand' && p.key.startsWith('z:') && p.matterId ? <Uebernehmen matterId={p.matterId} team={team} me={me} /> : null}
              {(p.art === 'ausstehend' || p.art === 'nachfassen') && p.taskId ? (
                <>
                  <Aktion onClick={() => run('task.complete', { id: p.taskId }, 'Ist da')}>Ist da</Aktion>
                  <Aktion variante="text" onClick={async () => {
                    const r = await erinnerung(p.taskId!);
                    if (r.ok) router.push(`/mail?entwurf=${(r.result as { id: string }).id}`);
                    else show(r, '', async () => r);
                  }}>Jetzt erinnern</Aktion>
                </>
              ) : null}
              {p.links.map((l) => <a key={l.href} className="kg-aktion kg-aktion--text" href={l.href}>{l.label}</a>)}
              {p.hintId && p.art !== 'frage' ? <Spaeter hintId={p.hintId} /> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
