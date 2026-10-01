// Detail of a matter or of a founding team ("Beratungsakte"). Server components; editing
// parts are client components that run actions (components/bearbeiten.tsx).
import { Fragment } from 'react';
import { Auswahl, Erledigen, Feld, Gespraech, Tu, Uebergeben, Zeile } from '@/components/bearbeiten';
import { EingabeStart } from '@/components/chat';
import { Abschnitt, Privat, Quelle, Vermutung, Verlauf, Zusage, type VerlaufEintrag } from '@/components/kg';
import { faellig, monat, tag } from '@/lib/format';
import type { AreaInfo, Commitment, MatterDetail } from '@/lib/views/areas';
import type { OrgDetail } from '@/lib/views/contacts';
import type { NoteRef, TimelineItem } from '@/lib/views/timeline';
import { berlinDate } from '@/lib/time';

type Team = { id: string; name: string }[];

export const ROLLE: Record<string, string> = {
  founder: 'Gründer:in', mentor: 'Mentor:in', partner: 'Partner:in', speaker: 'Referent:in', university: 'Universität', other: '–',
};

const ART: Record<string, VerlaufEintrag['art']> = { mail: 'Mail', event: 'Termin', note: 'Notiz', file: 'Datei', system: 'System' };

function verlauf(items: TimelineItem[], systemSteps: number, now: Date): VerlaufEintrag[] {
  const out: VerlaufEintrag[] = items.map((t, i) =>
    t.type === 'entry'
      ? { key: t.id, monat: monat(t.at), datum: tag(t.at, now), art: ART[t.kind] ?? 'Notiz', text: <><b style={{ fontWeight: 500 }}>{t.title ?? '–'}</b>{t.summary ? ` – ${t.summary}` : ''}</>, herkunft: t.author ?? undefined, privat: t.private }
      // E13: placeholder for what one may not read
      : { key: `stub-${i}`, monat: monat(t.at), datum: tag(t.at, now), art: ART[t.kind] ?? 'Mail', text: `${ART[t.kind] ?? 'Eintrag'} · Inhalt nur für ${t.owners.join(', ')}`, privat: true, privatFuer: t.owners.join(', ') },
  );
  // E16: system steps small and summarised
  if (systemSteps) out.push({ key: 'system', datum: '', art: 'System', text: `${systemSteps} Zuordnungen von Kollege` });
  return out.reverse();
}

function Zusagen({ c, now, href }: { c: { ours: Commitment[]; theirs: Commitment[] }; now: Date; href: string }) {
  const spalte = (xs: Commitment[], titel: string) => (
    <div>
      <h3 className="kg-zusagen-titel">{titel}</h3>
      {xs.filter((x) => x.status !== 'done').map((x) => (
        <Zusage key={x.id} status={x.overdue ? 'ueberfaellig' : 'offen'} faellig={x.due_at ? faellig(x.due_at, now) : undefined}
          quelle={x.source && !x.source.readable ? `aus ${x.source.owners.join(', ')}s Mail` : x.owner ?? undefined}
          aktion={<> <Tu type="task.complete" payload={{ id: x.id }} text="Erledigt" variante="text">abhaken</Tu></>}>
          {x.title}{x.status === 'in_progress' ? ' · in Arbeit' : ''}
        </Zusage>
      ))}
      {!xs.some((x) => x.status !== 'done') ? <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Keine offenen.</span> : null}
      {xs.filter((x) => x.status === 'done').length ? (
        <span className="mono">{xs.filter((x) => x.status === 'done').length} erledigt</span>
      ) : null}
    </div>
  );
  return (
    <Abschnitt id="d-zusagen" titel="Zusagen" aside={<>beider Seiten · <a className="kg-bezug" href={href}>in Aufgaben bearbeiten</a></>}>
      <div className="kg-zusagen">{spalte(c.ours, 'von uns')}{spalte(c.theirs, 'an uns')}</div>
    </Abschnitt>
  );
}

function Notizen({ notes, ziel, now }: { notes: NoteRef[]; ziel: { target_type: 'matter' | 'org'; target_id: string }; now: Date }) {
  const plain = notes.filter((n) => !n.conversation);
  return (
    <Abschnitt id="d-notizen" titel="Notizen" anzahl={plain.length}>
      <Zeile platzhalter="Notiz hinzufügen" knopf="+ Notiz" label="Notiz hinzufügen" text="Notiz abgelegt"
        ziel={{ type: 'note.create', base: ziel, key: 'body_text' }} />
      {plain.map((n) => (
        <div key={n.id} className="gz">
          <span className="mono">{tag(n.at, now)}</span>
          <div>
            {n.private ? <><Privat nurSymbol /> </> : null}
            {n.mine
              ? <Feld id={`n-${n.id}`} wert={n.body} mehrzeilig label="Notiz" change={{ type: 'note.update', base: { id: n.id }, key: 'body_text' }} />
              : <span style={{ whiteSpace: 'pre-line' }}>{n.body}</span>}
            <span className="mono"> {n.author}</span>
          </div>
        </div>
      ))}
    </Abschnitt>
  );
}

/** responsibility: take over if nobody, otherwise hand over (E45) */
function Zustaendig({ kind, id, owner, handoverTo, team, me }: { kind: 'matter' | 'org'; id: string; owner: { id: string; name: string } | null; handoverTo: { id: string; name: string } | null; team: Team; me: string }) {
  if (!owner) {
    return <span className="feldzeile"><span style={{ fontSize: 14 }}>niemand</span><Tu type={kind === 'matter' ? 'matter.assign' : 'org.update'} payload={kind === 'matter' ? { id, owner_user_id: me } : { id, owner_user_id: me }} text="Du bist jetzt zuständig" variante="text">Übernehmen</Tu></span>;
  }
  return (
    <span className="feldzeile">
      <span style={{ fontSize: 14, lineHeight: '28px' }}>{owner.name}</span>
      {handoverTo ? (
        <span role="status" className="mono">Übergabe an {handoverTo.name} – wartet auf Annahme</span>
      ) : owner.id === me ? (
        <Uebergeben kind={kind} id={id} andere={team.filter((u) => u.id !== me)} />
      ) : (
        <span className="mono">ändern über „Übergeben an“</span>
      )}
      {handoverTo && (owner.id === me || handoverTo.id === me) ? (
        <>
          {handoverTo.id === me ? <Tu type={`${kind}.handover_accept`} payload={{ id }} text="Übernommen">Annehmen</Tu> : null}
          <Tu type={`${kind}.handover_withdraw`} payload={{ id }} text={handoverTo.id === me ? 'Abgelehnt' : 'Zurückgezogen'} variante="text">{handoverTo.id === me ? 'Ablehnen' : 'Zurückziehen'}</Tu>
        </>
      ) : null}
    </span>
  );
}

function Ungeprueft({ typ, id, text }: { typ: 'matter' | 'org'; id: string; text: string }) {
  return (
    <div className="ungeprueft-banner">
      <Vermutung />
      <span>{text}</span>
      <span style={{ flexGrow: 1 }} />
      <Tu type="review.accept" payload={{ items: [{ type: typ, id }] }} text="Übernommen">Übernehmen</Tu>
      <Tu type="review.discard" payload={{ items: [{ type: typ, id }] }} text="Verworfen" variante="text">Verwerfen</Tu>
    </div>
  );
}

function FeldWert({ f, wert, ziel, ki }: { f: AreaInfo['fields'][number]; wert: unknown; ziel: { type: string; base: Record<string, unknown> }; ki: boolean }) {
  const id = `f-${f.key}`;
  const z = { ...ziel, key: `fields.${f.key}`, als: f.type === 'number' ? ('zahl' as const) : undefined };
  return (
    <>
      <label htmlFor={id}>{f.label}</label>
      <div className="feldzeile">
        {f.type === 'select'
          ? <Auswahl id={id} wert={(wert as string) ?? ''} optionen={f.options ?? []} label={f.label} change={z} leer="–" />
          : <Feld id={id} wert={wert == null ? '' : String(wert)} art={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} label={f.label} change={z} />}
        {ki && wert != null ? <Vermutung /> : null}
      </div>
    </>
  );
}

/** §11: the one input field, preloaded with this page (chat with context) */
export function Fragen({ bezug, kontext }: { bezug: { type: 'matter' | 'org' | 'person'; id: string }; kontext: string }) {
  return (
    <Abschnitt id="d-fragen" titel="Kollege fragen">
      <EingabeStart bezug={bezug} kontext={kontext} platzhalter="Frag oder notiere etwas dazu" />
    </Abschnitt>
  );
}

export function MatterAnsicht({ d, team, me, now }: { d: MatterDetail; team: Team; me: string; now: Date }) {
  const ziel = { type: 'matter.update', base: { id: d.id } };
  return (
    <>
      {d.unreviewed ? <Ungeprueft typ="matter" id={d.id} text="Von Kollege angelegt – stimmt das so?" /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="label" style={{ color: 'var(--ink-muted)' }}>
          {d.area.name_singular} · {d.status === 'done' ? 'erledigt' : 'offen'}{d.waiting ? ' · = wartet' : ''}{d.stale ? ' · = hängt' : ''}
        </div>
        <Feld id="d-titel" gross wert={d.title} label="Titel" change={{ ...ziel, key: 'title' }} />
        <div className="felder">
          {d.area.fields.filter((f) => f.type !== 'person').map((f) => (
            <FeldWert key={f.key} f={f} wert={d.fields[f.key]} ziel={ziel} ki={d.estimated.includes(f.key)} />
          ))}
          {d.area.phases.length ? (
            <>
              <label htmlFor="d-phase">Phase</label>
              <div className="feldzeile"><Auswahl id="d-phase" wert={d.phase ?? ''} optionen={d.area.phases} label="Phase" change={{ ...ziel, key: 'phase' }} leer="–" /></div>
            </>
          ) : null}
          <span className="fl">zuständig</span>
          <Zustaendig kind="matter" id={d.id} owner={d.owner} handoverTo={d.handoverTo} team={team} me={me} />
        </div>
        <div className="kg-aktionen">
          <Erledigen id={d.id} offen={d.status === 'open'} titel={`Wie lief ${d.area.name_singular === 'Event' ? 'das Event' : 'es'}?`} />
        </div>
        {d.outcome_note ? <div className="gz"><span className="mono">Wie lief’s</span><span>{d.outcome_note}</span></div> : null}
      </div>

      <Fragen bezug={{ type: 'matter', id: d.id }} kontext={`${d.area.name_singular} · ${d.title} · ${d.timeline.length} Einträge`} />

      <Abschnitt id="d-naechster" titel="Nächster Schritt">
        {d.nextStep ? (
          <div className="kg-aussage kg-aussage--berechnet">
            <span className="kg-glyph" aria-hidden="true">=</span>
            <span className="kg-aussage-text"><span className="kg-sr">berechnet: </span>{d.nextStep.title}{d.nextStep.due_at ? ` · ${faellig(d.nextStep.due_at, now)}` : ''} <Quelle href="/aufgaben">Aufgabe</Quelle></span>
          </div>
        ) : <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Keine offene Aufgabe von uns.</span>}
      </Abschnitt>

      <Zusagen c={d.commitments} now={now} href="/aufgaben" />
      <Notizen notes={d.notes} ziel={{ target_type: 'matter', target_id: d.id }} now={now} />

      <Abschnitt id="d-bezuege" titel="Bezüge" aside="über Bereiche hinweg">
        <div className="chips">
          {d.references.map((r) => (
            <span key={`${r.type}-${r.id}-${r.relation}`} className="bz">
              <span className="mono">{r.relation}</span>
              <a className="kg-bezug" href={r.type === 'matter' ? `/m/${r.id}` : `/kontakte?typ=${r.type === 'org' ? 'org' : 'person'}&id=${r.id}`}>{r.title}</a>
            </span>
          ))}
          {!d.references.length ? <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Noch keine.</span> : null}
        </div>
      </Abschnitt>

      {d.files.length ? (
        <Abschnitt id="d-dateien" titel="Dateien" anzahl={d.files.length}>
          {d.files.map((f) => <div key={f.id} className="gz"><span className="mono">{tag(f.at, now)}</span><span>{f.title}{f.summary ? <span className="mono"> {f.summary}</span> : null}</span></div>)}
        </Abschnitt>
      ) : null}

      <Abschnitt id="d-verlauf" titel="Verlauf" aside="streng chronologisch · fremde Mails nur als Platzhalter">
        <Verlauf eintraege={verlauf(d.timeline, d.systemSteps, now)} />
      </Abschnitt>
    </>
  );
}

export function OrgAnsicht({ d, area, team, me, now }: { d: OrgDetail; area: AreaInfo; team: Team; me: string; now: Date }) {
  const ziel = { type: 'org.update', base: { id: d.id, fields: d.fields } };
  const gespraeche = d.notes.filter((n) => n.conversation);
  return (
    <>
      {d.unreviewed ? <Ungeprueft typ="org" id={d.id} text="Von Kollege angelegt – ist das ein Gründungsteam?" /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="label" style={{ color: 'var(--ink-muted)' }}>{area.name_singular} · Beratungsakte</div>
        <Feld id="d-titel" gross wert={d.name} label="Name" change={{ type: 'org.update', base: { id: d.id }, key: 'name' }} />
        <div className="felder">
          {area.fields.map((f) =>
            f.type === 'person' ? (
              <Fragment key={f.key}>
                <span className="fl">{f.label}</span>
                <Zustaendig kind="org" id={d.id} owner={d.owner} handoverTo={d.handoverTo} team={team} me={me} />
              </Fragment>
            ) : f.key === 'phase' ? (
              <Fragment key={f.key}>
                <label htmlFor="d-phase">{f.label}</label>
                <div className="feldzeile"><Auswahl id="d-phase" wert={d.phase ?? ''} optionen={area.phases} label={f.label} change={{ type: 'org.update', base: { id: d.id }, key: 'phase' }} leer="–" /></div>
              </Fragment>
            ) : (
              <FeldWert key={f.key} f={f} wert={d.fields[f.key]} ziel={ziel} ki={false} />
            ),
          )}
          <span className="fl">letzter Kontakt</span>
          <span className="mono" style={{ lineHeight: '28px' }}>{d.lastContact ? `= ${tag(d.lastContact, now)}` : '–'}</span>
        </div>
      </div>

      <Abschnitt id="d-personen" titel="Personen" anzahl={d.people.length} aside={<a className="kg-bezug" href={`/kontakte?typ=org&id=${d.id}`}>im Adressbuch</a>}>
        {d.people.map((p) => (
          <div key={p.id} className="gz"><span className="mono">{ROLLE[p.role] ?? p.role}</span><span><a className="kg-bezug" href={`/kontakte?typ=person&id=${p.id}`}>{p.name}</a> <span className="mono">{p.emails[0] ?? ''}</span></span></div>
        ))}
      </Abschnitt>

      <Fragen bezug={{ type: 'org', id: d.id }} kontext={`${d.name} · ${d.timeline.length} Einträge`} />

      <Abschnitt id="d-gespraeche" titel="Gespräche" anzahl={gespraeche.length} aside="Beratungen, Telefonate, Treffen">
        <Gespraech targetType="org" targetId={d.id} heute={berlinDate(now)} />
        {gespraeche.map((g) => (
          <div key={g.id} className="gz">
            <span className="mono">{tag(g.at, now)}</span>
            <div><b style={{ fontWeight: 500 }}>{g.conversation!.art}</b> <span className="mono">{g.conversation!.mit} · {g.author}</span><div style={{ whiteSpace: 'pre-line' }}>{g.body}</div></div>
          </div>
        ))}
      </Abschnitt>

      <Zusagen c={d.commitments} now={now} href="/aufgaben" />

      <Abschnitt id="d-themen" titel="Themen" aside="optional">
        <div className="chips">
          {d.matters.map((m) => (
            <span key={m.id} className="bz" style={m.unreviewed ? { borderStyle: 'dashed', borderColor: 'var(--line-control)' } : undefined}>
              <a className="kg-bezug" href={`/b/${area.key}?id=${d.id}&thema=${m.id}`}>{m.title}</a>
              {m.status === 'done' ? <span className="mono">erledigt</span> : null}
              {m.unreviewed ? <Vermutung /> : null}
            </span>
          ))}
        </div>
        <Zeile platzhalter="+ Thema" knopf="Hinzufügen" label="Thema hinzufügen" text="Thema angelegt"
          ziel={{ type: 'matter.create', base: { area_key: area.key, org_id: d.id, owner_user_id: d.owner?.id ?? me }, key: 'title' }} />
      </Abschnitt>

      <Notizen notes={d.notes} ziel={{ target_type: 'org', target_id: d.id }} now={now} />

      <Abschnitt id="d-verlauf" titel="Verlauf" aside="streng chronologisch · fremde Mails nur als Platzhalter">
        <Verlauf eintraege={verlauf(d.timeline, d.systemSteps, now)} />
      </Abschnitt>
    </>
  );
}

