// Kontakte: the address book – people and organisations, linked by id (E47).
// A founding team is also a contact; its work lives in the "Beratungsakte" (E30).
import { currentUserId } from '@/auth';
import { Auswahl, Feld, Pruefen, Tu, type Zeile as ListZeile } from '@/components/bearbeiten';
import { Grundlage } from '@/components/belege';
import { Abschnitt, Etikett, Leer, Vermutung, Verlauf, type VerlaufEintrag } from '@/components/kg';
import { faellig, monat, tag } from '@/lib/format';
import { contactList, orgDetail, personDetail } from '@/lib/views/contacts';
import { Fragen, ROLLE } from '../b/[key]/detail';

export const dynamic = 'force-dynamic';

type Search = { typ?: string; id?: string; art?: string; ungeprueft?: string; q?: string; voll?: string };

const ORG_ROLLE: Record<string, string> = { founding_team: 'Gründungsteam', partner: 'Partner', university: 'Universität', other: 'Sonstige' };
/** a person's role in the list; "other" is no information */
const personArt = (r: string) => (r === 'other' ? '–' : (ROLLE[r] ?? r));
const ART: Record<string, VerlaufEintrag['art']> = { mail: 'Mail', event: 'Termin', note: 'Notiz', file: 'Datei' };

export default async function Kontakte({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const { rows: alle, unreviewedCount } = await contactList(userId, { unreviewed: sp.ungeprueft === '1' });
  const q = sp.q?.trim().toLowerCase();
  const rows = alle.filter((c) =>
    (!sp.art || c.type === sp.art) && (!q || `${c.name} ${c.detail ?? ''} ${c.emails.join(' ')}`.toLowerCase().includes(q)));
  const orgs = alle.filter((c) => c.type === 'org');
  const url = (patch: Partial<Search>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/kontakte${s.size ? `?${s}` : ''}`;
  };
  const chip = (label: string, patch: Partial<Search>, an: boolean) => <a key={label} className="chip" role="button" aria-pressed={an} href={url(patch)}>{label}</a>;

  const person = sp.typ === 'person' && sp.id ? await personDetail(userId, sp.id, now) : null;
  const org = sp.typ === 'org' && sp.id ? await orgDetail(userId, sp.id, now) : null;
  const offen = Boolean(person || org);
  const raster = offen ? 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,.7fr)' : 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,.7fr) minmax(0,1.3fr)';
  const zeilen: ListZeile[] = rows.map((c) => ({
    id: c.id, typ: c.type,
    href: url({ typ: c.type, id: c.id }),
    aktiv: c.id === sp.id,
    zellen: [
      { text: c.name, klasse: 't1' },
      { text: c.org ?? '–' },
      { text: c.type === 'person' ? personArt(c.rolle) : (ORG_ROLLE[c.rolle] ?? '–') },
      ...(offen ? [] : [{ text: c.emails.join(', ') || '–', klasse: 'tm' }]),
    ],
  }));

  const verlauf = (items: NonNullable<typeof person>['timeline']): VerlaufEintrag[] =>
    items.map((t, i) => t.type === 'entry'
      ? { key: t.id, monat: monat(t.at), datum: tag(t.at, now), art: ART[t.kind] ?? 'Notiz', text: t.title ?? '–', herkunft: t.author ?? undefined, privat: t.private }
      : { key: `s${i}`, monat: monat(t.at), datum: tag(t.at, now), art: ART[t.kind] ?? 'Mail', text: `Inhalt nur für ${t.owners.join(', ')}`, privat: true, privatFuer: t.owners.join(', ') }).reverse();

  return (
    <div className={offen ? (sp.voll ? 'ld ld--voll' : 'ld') : 'ld ld--zu'}>
      <div className="ld-liste">
        <div className="ld-kopf">
          <div className="ld-kopfzeile"><h1>Kontakte</h1><span className="mono">{rows.length}</span></div>
          <form action="/kontakte" role="search">
            {Object.entries(sp).filter(([k, v]) => k !== 'q' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="such" name="q" defaultValue={sp.q ?? ''} placeholder="Name, Organisation oder Adresse" aria-label="Kontakte durchsuchen" />
          </form>
          <div className="filterzeile" role="group" aria-label="Filter">
            {chip('alle', { art: undefined }, !sp.art)}
            {chip('Personen', { art: 'person' }, sp.art === 'person')}
            {chip('Organisationen', { art: 'org' }, sp.art === 'org')}
            {chip(`ungeprüft · ${unreviewedCount}`, { ungeprueft: sp.ungeprueft ? undefined : '1' }, sp.ungeprueft === '1')}
          </div>
        </div>
        <div className="tkopf" style={{ gridTemplateColumns: raster, paddingLeft: sp.ungeprueft === '1' ? 40 : 20 }}>
          <span>Name</span><span>Organisation</span><span>Art</span>{offen ? null : <span>Adressen</span>}
        </div>
        <div className="ld-scroll">
          {sp.ungeprueft === '1'
            ? <Pruefen typ="person" raster={raster} zeilen={zeilen} />
            : zeilen.map((z) => (
              <a key={z.id} className="tz" style={{ gridTemplateColumns: raster }} href={z.href} aria-current={z.aktiv ? 'true' : undefined}>
                {z.zellen.map((c, i) => <span key={i} className={c.klasse}>{c.text}</span>)}
              </a>
            ))}
          {!rows.length ? <div style={{ padding: 20 }}><Leer titel="Keine Kontakte in dieser Ansicht." /></div> : null}
        </div>
      </div>

      {person ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="ld-wort" href={url({ voll: sp.voll ? undefined : '1' })}>{sp.voll ? 'Verkleinern' : 'Vollbild'}</a><a className="x-knopf" href={url({ id: undefined, typ: undefined, voll: undefined })} aria-label="Detailansicht schließen">×</a></div>
          {person.unreviewed ? (
            <div className="ungeprueft-banner"><Vermutung /><span>Von Kollege angelegt – gibt es diese Person so?</span><span style={{ flexGrow: 1 }} />
              <Tu type="review.accept" payload={{ items: [{ type: 'person', id: person.id }] }} text="Übernommen">Übernehmen</Tu>
              <Tu type="review.discard" payload={{ items: [{ type: 'person', id: person.id }] }} text="Verworfen" variante="text">Verwerfen</Tu></div>
          ) : null}
          <Grundlage key={`g${person.id}`} belege={person.belege} web={person.web} />
          <div className="label" style={{ color: 'var(--ink-muted)' }}>Person</div>
          <Feld id="p-name" gross wert={person.name} label="Name" change={{ type: 'person.update', base: { id: person.id }, key: 'name' }} />
          <div className="felder">
            <label htmlFor="p-org">Organisation</label>
            <div className="feldzeile">
              <Auswahl id="p-org" wert={person.org?.id ?? ''} optionen={orgs.map((o) => [o.id, o.name] as [string, string])} label="Organisation" leer="–"
                change={{ type: 'person.update', base: { id: person.id }, key: 'org_id' }} />
              {person.org ? <a className="kg-bezug" href={url({ typ: 'org', id: person.org.id })}>öffnen</a> : null}
            </div>
            <label htmlFor="p-rolle">Rolle</label>
            <div className="feldzeile"><Auswahl id="p-rolle" wert={person.role} optionen={Object.entries(ROLLE).map(([k, v]) => [k, v === '–' ? 'sonstige' : v] as [string, string])} label="Rolle" change={{ type: 'person.update', base: { id: person.id }, key: 'role' }} /></div>
            <span className="fl">Adressen</span>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 14, lineHeight: '28px' }}>
              {person.emails.map((e) => <span key={e.email}><a className="kg-bezug" href={`mailto:${e.email}`}>{e.email}</a> <span className="mono">{e.source === 'manual' ? 'von Hand' : e.source === 'calendar' ? 'aus Kalender' : 'aus Mail'}</span></span>)}
            </div>
            <label htmlFor="p-notiz">Notiz</label>
            <Feld id="p-notiz" wert={person.notes ?? ''} mehrzeilig label="Notiz" change={{ type: 'person.update', base: { id: person.id }, key: 'notes' }} />
          </div>
          <Fragen bezug={{ type: 'person', id: person.id }} kontext={`${person.name} · ${person.timeline.length} Einträge`} />
          <Abschnitt id="p-bei" titel="Beteiligt an" anzahl={person.matters.length}>
            {person.matters.map((m) => <div key={m.id} className="gz"><Etikett>{m.area}</Etikett><a className="kg-bezug" href={`/m/${m.id}`}>{m.title}</a></div>)}
          </Abschnitt>
          <Abschnitt id="p-schuldet" titel="Schuldet uns" anzahl={person.owes.filter((t) => t.status !== 'done').length}>
            {person.owes.filter((t) => t.status !== 'done').map((t) => <div key={t.id} className="gz"><span className={t.overdue ? 'mono ta' : 'mono'} style={t.overdue ? { color: 'var(--attention)' } : undefined}>{t.due_at ? faellig(t.due_at, now) : '–'}</span><span>{t.title}</span></div>)}
          </Abschnitt>
          <Abschnitt id="p-verlauf" titel="Verlauf"><Verlauf eintraege={verlauf(person.timeline)} /></Abschnitt>
        </div>
      ) : org ? (
        <div className="ld-detail">
          <div className="ld-zu"><a className="ld-wort" href={url({ voll: sp.voll ? undefined : '1' })}>{sp.voll ? 'Verkleinern' : 'Vollbild'}</a><a className="x-knopf" href={url({ id: undefined, typ: undefined, voll: undefined })} aria-label="Detailansicht schließen">×</a></div>
          {org.unreviewed ? (
            <div className="ungeprueft-banner"><Vermutung /><span>Von Kollege angelegt – gibt es diese Organisation so?</span><span style={{ flexGrow: 1 }} />
              <Tu type="review.accept" payload={{ items: [{ type: 'org', id: org.id }] }} text="Übernommen">Übernehmen</Tu>
              <Tu type="review.discard" payload={{ items: [{ type: 'org', id: org.id }] }} text="Verworfen" variante="text">Verwerfen</Tu></div>
          ) : null}
          <Grundlage key={`g${org.id}`} belege={org.belege} />
          <div className="label" style={{ color: 'var(--ink-muted)' }}>Organisation</div>
          <Feld id="o-name" gross wert={org.name} label="Name" change={{ type: 'org.update', base: { id: org.id }, key: 'name' }} />
          <div className="felder">
            <label htmlFor="o-art">Art</label>
            <div className="feldzeile">
              <Auswahl id="o-art" wert={org.role} optionen={Object.entries(ORG_ROLLE)} label="Art" change={{ type: 'org.update', base: { id: org.id }, key: 'role' }} />
              {org.role === 'founding_team' ? <a className="kg-bezug" href={`/b/founding_teams?id=${org.id}`}>Zur Beratungsakte</a> : null}
            </div>
            <span className="fl">Domains</span>
            <span className="mono" style={{ lineHeight: '28px' }}>{org.domains.join(', ') || '–'}</span>
          </div>
          <Fragen bezug={{ type: 'org', id: org.id }} kontext={`${org.name} · ${org.timeline.length} Einträge`} />
          <Abschnitt id="o-personen" titel="Personen" anzahl={org.people.length}>
            {org.people.map((p) => <div key={p.id} className="gz"><span className="mono">{ROLLE[p.role] ?? p.role}</span><a className="kg-bezug" href={url({ typ: 'person', id: p.id })}>{p.name}</a></div>)}
          </Abschnitt>
          <Abschnitt id="o-verlauf" titel="Verlauf"><Verlauf eintraege={verlauf(org.timeline)} /></Abschnitt>
        </div>
      ) : null}
    </div>
  );
}
