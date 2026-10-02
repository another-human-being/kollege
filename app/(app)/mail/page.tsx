// Mail (§11, E26, E38): threads with mailbox switch (mine / StartHub / all), folders, filters;
// a thread with its mails or the editor for a draft.
import { currentUserId } from '@/auth';
import { EntwurfMeta } from '@/lib/actions/mail';
import { GelesenBeimOeffnen, NeueMail, Schreibfeld, ThreadKopf } from '@/components/mail';
import { Abschnitt, Leer, Privat, Umschalter } from '@/components/kg';
import { tag, zeitpunkt } from '@/lib/format';
import { entwurf, mailThread, postfaecher, threadListe, zuordnungsziele, type MailFilter, type Ordner, type Postfach } from '@/lib/views/mail';

export const dynamic = 'force-dynamic';

type Search = { p?: string; o?: string; f?: string; q?: string; t?: string; entwurf?: string };
const ORDNER: [Ordner, string][] = [['eingang', 'Eingang'], ['gesendet', 'Gesendet'], ['archiv', 'Archiv'], ['entwuerfe', 'Entwürfe']];
const FILTER: [MailFilter, string][] = [['ungelesen', 'Ungelesen'], ['anhang', 'Mit Anhang'], ['ohne_zuordnung', 'Ohne Zuordnung']];
const adr = (a: { name?: string; email: string }) => (a.name ? `${a.name} <${a.email}>` : a.email);

export default async function Mail({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const boxes = await postfaecher(userId);
  const postfach: Postfach = sp.p === 'starthub' || sp.p === 'alle' ? sp.p : boxes.mein ? 'mein' : 'alle';
  const ordner: Ordner = (ORDNER.find(([k]) => k === sp.o)?.[0]) ?? 'eingang';
  const filter = FILTER.find(([k]) => k === sp.f)?.[0];
  const url = (patch: Partial<Search>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/mail${s.size ? `?${s}` : ''}`;
  };

  const [threads, thread, d, ziele] = await Promise.all([
    threadListe(userId, { postfach, ordner, filter, q: sp.q }),
    sp.t ? mailThread(userId, sp.t) : null,
    sp.entwurf ? entwurf(userId, sp.entwurf) : null,
    sp.t ? zuordnungsziele(userId) : [],
  ]);
  const ungelesen = threads.filter((t) => t.ungelesen).length;
  const absender = [boxes.mein && { id: boxes.mein.id, label: boxes.mein.address }, boxes.starthub && { id: boxes.starthub.id, label: boxes.starthub.address }]
    .filter((x): x is { id: string; label: string } => !!x);
  const offen = Boolean(thread || d);

  return (
    <div className={offen ? 'ld' : 'ld ld--zu'}>
      <div className="ld-liste ld-liste--breit">
        <div className="ld-kopf">
          <div className="ld-kopfzeile">
            <h1>Mail</h1>
            <span className="mono">{ungelesen ? `${ungelesen} ungelesen` : 'alles gelesen'}</span>
            <span style={{ flexGrow: 1 }} />
            {absender.length ? <NeueMail /> : null}
          </div>
          <Umschalter label="Postfach" optionen={[
            ...(boxes.mein ? [{ label: 'Mein Postfach', href: url({ p: 'mein', t: undefined }), aktiv: postfach === 'mein' }] : []),
            ...(boxes.starthub ? [{ label: 'StartHub', href: url({ p: 'starthub', t: undefined }), aktiv: postfach === 'starthub' }] : []),
            { label: 'Alle', href: url({ p: 'alle', t: undefined }), aktiv: postfach === 'alle' },
          ]} />
          <form action="/mail" role="search">
            {Object.entries(sp).filter(([k, v]) => k !== 'q' && k !== 't' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="such" name="q" defaultValue={sp.q ?? ''} placeholder="Mails durchsuchen" aria-label="Mails durchsuchen" />
          </form>
          <div className="filterzeile" role="group" aria-label="Ordner">
            {ORDNER.map(([k, l]) => <a key={k} className="chip" role="button" aria-pressed={ordner === k} href={url({ o: k === 'eingang' ? undefined : k, t: undefined })}>{l}</a>)}
          </div>
          <div className="filterzeile" role="group" aria-label="Filter">
            {FILTER.map(([k, l]) => <a key={k} className="chip" role="button" aria-pressed={filter === k} href={url({ f: filter === k ? undefined : k })}>{l}</a>)}
          </div>
        </div>
        <div className="ld-scroll">
          {threads.map((t) => {
            const href = t.thread.startsWith('entwurf:') ? url({ entwurf: t.thread.slice(8), t: undefined }) : url({ t: t.thread, entwurf: undefined });
            const aktiv = t.thread === sp.t || t.thread === `entwurf:${sp.entwurf}`;
            return (
              <a key={t.thread} className={t.ungelesen ? 'mz mz--neu' : 'mz'} href={href} aria-current={aktiv ? 'true' : undefined}>
                <span className="mz-von">{t.ungelesen ? <span className="kg-sr">ungelesen: </span> : null}{t.von}</span>
                <span className="mono mz-zeit">{tag(t.at, now)}</span>
                <span className="mz-betreff">{t.betreff || '(ohne Betreff)'}{t.anzahl > 1 ? <span className="mono"> · {t.anzahl}</span> : null}</span>
                <span className="mz-vorschau">{t.vorschau}</span>
                <span className="mono mz-meta">{[t.bezug, t.anhang ? 'Anhang' : null].filter(Boolean).join(' · ')}</span>
              </a>
            );
          })}
          {!threads.length ? (
            <div style={{ padding: 20 }}>
              <Leer titel={absender.length || postfach === 'alle' ? 'Keine Mails in dieser Ansicht.' : 'Kein Postfach verbunden.'}
                text={absender.length || postfach === 'alle' ? (sp.q || filter ? 'Ein Filter ist aktiv.' : undefined) : 'Ein Postfach verbindet ihr in den Einstellungen unter Quellen.'} />
            </div>
          ) : null}
        </div>
      </div>

      {d ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="x-knopf" href={url({ entwurf: undefined })} aria-label="Schließen">×</a></div>
          <Schreibfeld key={d.id} postfaecher={absender} zurueck={url({ entwurf: undefined, o: undefined })} d={(() => {
            const m = EntwurfMeta.parse(d.meta);
            return {
              id: d.id, connection_id: m.connection_id, to: m.to, cc: m.cc, bcc: m.bcc, subject: d.title ?? '', body: d.body_text ?? '',
              art: m.art, bezug_entry_id: m.bezug_entry_id, attachments: m.attachments, by_model: m.by_model,
              status: m.send?.status ?? 'entwurf', fehler: m.send?.error,
            };
          })()} />
        </div>
      ) : thread ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="x-knopf" href={url({ t: undefined })} aria-label="Schließen">×</a></div>
          <GelesenBeimOeffnen ids={thread.nachrichten.filter((n) => n.ungelesen).map((n) => n.id)} />
          <h2 style={{ margin: 0 }}>{thread.betreff || '(ohne Betreff)'}</h2>
          <ThreadKopf letzteId={thread.nachrichten.at(-1)!.id} eingangIds={thread.nachrichten.filter((n) => n.imEingang).map((n) => n.id)}
            bezuege={thread.bezuege} ziele={ziele} />
          {thread.entwuerfe.length ? (
            <div className="filterzeile"><span className="mono">Entwurf</span>
              {thread.entwuerfe.map((e) => <a key={e.id} className="kg-bezug" href={url({ entwurf: e.id, t: undefined })}>{e.title || '(ohne Betreff)'} · {zeitpunkt(e.updated_at, now)}</a>)}
            </div>
          ) : null}
          <Abschnitt id="m-verlauf" titel="Verlauf" anzahl={thread.nachrichten.length + thread.platzhalter.length}>
            {[...thread.nachrichten.map((n) => ({ at: n.at, n })), ...thread.platzhalter.map((p) => ({ at: p.at, p }))]
              .sort((a, b) => a.at.localeCompare(b.at))
              .map((x, i) => 'n' in x && x.n ? (
                <article key={x.n.id} className="mail">
                  <div className="mail-kopf">
                    <strong>{adr(x.n.von)}</strong>
                    <span className="mono">{zeitpunkt(x.n.at, now)}</span>
                  </div>
                  <div className="mono mail-an">an {x.n.an.map(adr).join(', ') || '–'}{x.n.cc.length ? ` · cc ${x.n.cc.map(adr).join(', ')}` : ''}</div>
                  <div className="mail-text">{x.n.text}</div>
                  {x.n.anhaenge.length ? (
                    <ul className="anhaenge">
                      {x.n.anhaenge.map((a) => <li key={a.index}><a className="kg-bezug" href={`/api/anhang/${x.n.id}/${a.index}`}>{a.filename}</a></li>)}
                    </ul>
                  ) : null}
                  {x.n.ueberKollege ? <div className="mono" style={{ color: 'var(--ink-muted)' }}>über Kollege gesendet</div> : null}
                </article>
              ) : 'p' in x && x.p ? (
                <div key={`p${i}`} className="mail mail--platzhalter">
                  <Privat fuer={x.p.owners.join(', ')}>Mail · Inhalt nur für {x.p.owners.join(', ')}</Privat>
                  <span className="mono">{zeitpunkt(x.p.at, now)}</span>
                </div>
              ) : null)}
          </Abschnitt>
        </div>
      ) : sp.t ? (
        <div className="ld-detail"><Leer titel="Nicht gefunden." text="Diese Mail ist weg oder nicht für dich sichtbar." /></div>
      ) : null}
    </div>
  );
}
