// Bereich: list + detail, one template for all areas (§8.3, E29). Columns from areas.fields.
// Founding teams list organisations; their detail is the "Beratungsakte" (§4.3, E30).
import { notFound } from 'next/navigation';
import { currentUserId } from '@/auth';
import { MehrMenue } from '@/components/bearbeiten';
import { AusVorjahr, NeuAnlegen, Pruefen, type Zeile as ListZeile } from '@/components/bearbeiten';
import { Leer } from '@/components/kg';
import { tag } from '@/lib/format';
import { areaList, matterDetail, type AreaField, type AreaFilter, type AreaInfo, type AreaRow } from '@/lib/views/areas';
import { orgDetail } from '@/lib/views/contacts';
import { navigation } from '@/lib/views/nav';
import { MatterAnsicht, OrgAnsicht } from './detail';

export const dynamic = 'force-dynamic';

type Search = { id?: string; thema?: string; phase?: string; zustaendig?: string; status?: string; ungeprueft?: string; haengt?: string; q?: string; zu?: string; voll?: string };

interface Spalte {
  label: string;
  breite: string;
  wert: (r: AreaRow, now: Date) => string;
  klasse?: (r: AreaRow) => string | undefined;
}

/** columns: title, then the area's fields (person → responsible, phase → phase column) */
function spalten(area: AreaInfo): Spalte[] {
  const orgBased = area.matter_kind === 'org_based';
  const out: Spalte[] = [{ label: area.name_singular, breite: '1.4fr', wert: (r) => r.title, klasse: () => 't1' }];
  const fields: AreaField[] = area.fields;
  for (const f of fields) {
    if (f.type === 'person') out.push({ label: f.label, breite: '90px', wert: (r) => r.owner ?? '–' });
    else if (f.key === 'phase') out.push({ label: f.label, breite: '100px', wert: (r) => r.phase ?? '–' });
    else if (f.type === 'date') out.push({ label: f.label, breite: '96px', wert: (r, now) => (r.fields[f.key] ? tag(`${r.fields[f.key] as string}T12:00:00Z`, now) : '–'), klasse: () => 'tm' });
    else out.push({ label: f.label, breite: f.type === 'number' ? '70px' : '1fr', wert: (r) => (r.fields[f.key] == null ? '–' : String(r.fields[f.key])) });
  }
  if (area.phases.length && !fields.some((f) => f.key === 'phase')) out.push({ label: 'Phase', breite: '100px', wert: (r) => r.phase ?? '–' });
  if (!fields.some((f) => f.type === 'person')) out.push({ label: 'zuständig', breite: '90px', wert: (r) => r.owner ?? 'niemand' });
  if (orgBased) out.push({ label: 'letzter Kontakt', breite: '96px', wert: (r, now) => tag(r.last_activity, now), klasse: () => 'tm' });
  // computed states with "=" (E27): wartet, hängt
  out.push({
    label: '', breite: '80px',
    wert: (r) => [r.waiting ? '= wartet' : '', r.stale ? '= hängt' : ''].filter(Boolean).join(' '),
    klasse: (r) => (r.stale ? 'tm ta' : 'tm'),
  });
  return out;
}

export default async function Bereich({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Search> }) {
  const { key } = await params;
  const sp = await searchParams;
  const userId = await currentUserId();
  const now = new Date();
  const nav = await navigation(userId);
  if (!nav.areas.some((a) => a.key === key)) notFound();

  const filter: AreaFilter = {
    phase: sp.phase,
    owner: sp.zustaendig === 'ich' ? userId : sp.zustaendig === 'niemand' ? 'none' : undefined,
    status: sp.status === 'erledigt' ? 'done' : 'open',
    unreviewed: sp.ungeprueft === '1',
  };
  const [{ area, rows: alle, unreviewedCount }, erledigt] = await Promise.all([
    areaList(userId, key, filter, now),
    areaList(userId, key, { status: 'done' }, now),
  ]);
  const q = sp.q?.trim().toLowerCase();
  const rows = alle.filter((r) => (!q || r.title.toLowerCase().includes(q)) && (sp.haengt !== '1' || r.stale));
  const orgBased = area.matter_kind === 'org_based';
  // founding teams: the file of the team, or one of its topics (?thema=)
  const thema = orgBased && sp.thema && sp.zu !== '1' ? await matterDetail(userId, sp.thema, now) : null;
  const detail = sp.id && sp.zu !== '1'
    ? orgBased && !thema
      ? await orgDetail(userId, sp.id, now)
      : thema ?? (await matterDetail(userId, sp.id, now))
    : null;
  // E34: next to an open detail the list is narrow – title, the first two fields, the state;
  // without detail all columns (otherwise fixed widths squeeze the title to zero)
  const alleSpalten = spalten(area);
  const cols = detail ? [...alleSpalten.slice(0, 3), alleSpalten.at(-1)!] : alleSpalten;
  const raster = cols.map((c) => `minmax(0, ${c.breite})`).join(' ');

  // keep the filters in every link; change one at a time
  const url = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/b/${key}${s.size ? `?${s}` : ''}`;
  };
  const chip = (label: string, patch: Partial<Search>, an: boolean) => (
    <a key={label} className="chip" role="button" aria-pressed={an} href={url({ ...patch, id: sp.id })}>{label}</a>
  );

  const zeilen: ListZeile[] = rows.map((r) => ({
    id: r.id,
    href: url({ id: r.id, zu: undefined }),
    aktiv: r.id === sp.id,
    zellen: cols.map((c) => ({ text: c.wert(r, now), klasse: c.klasse?.(r) })),
  }));

  const vorlagen = (area.actions as string[]).includes('from_previous')
    ? [...alle, ...erledigt.rows].filter((r) => r.type === 'matter').map((r) => ({ id: r.id, title: r.title }))
    : [];
  const neu = orgBased
    ? { type: 'org.create', base: { role: 'founding_team', owner_user_id: userId }, key: 'name' }
    : { type: 'matter.create', base: { area_key: key, owner_user_id: userId }, key: 'title' };

  return (
    <div className={detail ? (sp.voll ? 'ld ld--voll' : 'ld') : 'ld ld--zu'}>
      <div className="ld-liste ld-liste--breit">
        <div className="ld-kopf">
          <div className="ld-kopfzeile">
            <h1>{area.name_plural}</h1>
            <span className="mono">{rows.length} {filter.status === 'done' ? 'erledigt' : 'offen'}</span>
            <span style={{ flexGrow: 1 }} />
            {(area.actions as string[]).includes('new') ? (
              <NeuAnlegen label={orgBased ? '+ Neues Team' : `+ ${area.name_singular}`} ziel={neu} oeffnen={`/b/${key}?id=`} />
            ) : null}
          </div>
          {vorlagen.length ? <AusVorjahr vorlagen={vorlagen} oeffnen={`/b/${key}?id=`} /> : null}
          <form action={`/b/${key}`} role="search">
            {Object.entries(sp).filter(([k, v]) => k !== 'q' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="such" name="q" defaultValue={sp.q ?? ''} placeholder="Suchen" aria-label={`${area.name_plural} durchsuchen`} />
          </form>
          <div className="filterzeile" role="group" aria-label="Filter">
            {chip('alle', { phase: undefined, haengt: undefined, ungeprueft: undefined }, !sp.phase && !sp.haengt && !sp.ungeprueft)}
            {area.phases.map((p) => chip(p, { phase: sp.phase === p ? undefined : p }, sp.phase === p))}
            {chip('hängt', { haengt: sp.haengt ? undefined : '1' }, sp.haengt === '1')}
            {chip(`ungeprüft · ${unreviewedCount}`, { ungeprueft: sp.ungeprueft ? undefined : '1' }, sp.ungeprueft === '1')}
          </div>
          <div className="filterzeile" role="group" aria-label="Zuständig und Status">
            <span className="mono">zuständig</span>
            {chip('alle', { zustaendig: undefined }, !sp.zustaendig)}
            {chip('ich', { zustaendig: 'ich' }, sp.zustaendig === 'ich')}
            {chip('niemand', { zustaendig: 'niemand' }, sp.zustaendig === 'niemand')}
            <span className="mono" style={{ marginLeft: 8 }}>status</span>
            {chip('offen', { status: undefined }, sp.status !== 'erledigt')}
            {chip('erledigt', { status: 'erledigt' }, sp.status === 'erledigt')}
          </div>
        </div>
        <div className="tkopf" style={{ gridTemplateColumns: raster, paddingLeft: sp.ungeprueft === '1' ? 40 : 20 }}>
          {cols.map((c, i) => <span key={i}>{c.label}</span>)}
        </div>
        <div className="ld-scroll">
          {sp.ungeprueft === '1' ? (
            <Pruefen typ={orgBased ? 'org' : 'matter'} raster={raster} zeilen={zeilen} />
          ) : (
            zeilen.map((z) => (
              <a key={z.id} className="tz" style={{ gridTemplateColumns: raster }} href={z.href} aria-current={z.aktiv ? 'true' : undefined}>
                {z.zellen.map((c, i) => <span key={i} className={c.klasse}>{c.text}</span>)}
              </a>
            ))
          )}
          {!rows.length ? (
            <div style={{ padding: 20 }}>
              <Leer titel="Nichts in dieser Ansicht." text={sp.q || sp.phase || sp.haengt || sp.ungeprueft || sp.zustaendig ? 'Ein Filter ist aktiv.' : `Noch keine ${area.name_plural}.`} />
            </div>
          ) : null}
        </div>
      </div>

      {detail ? (
        <div className="ld-detail">
          <div className="ld-zu">
            {/* E58: rare actions behind "⋯"; E52: the detail as full screen over its list */}
            {detail.owner?.id === userId && !detail.handoverTo
              ? <MehrMenue kind={orgBased && !thema ? 'org' : 'matter'} id={detail.id} andere={nav.team.filter((u) => u.id !== userId)} />
              : null}
            <a className="ld-wort" href={url({ voll: sp.voll ? undefined : '1' })}>{sp.voll ? 'Verkleinern' : 'Vollbild'}</a>
            <a className="x-knopf" href={url({ zu: '1', voll: undefined })} aria-label="Detailansicht schließen" title="Schließen">×</a>
          </div>
          {thema ? <a className="kg-bezug" href={url({ thema: undefined })} style={{ fontSize: 14 }}>← zur Beratungsakte</a> : null}
          {orgBased && !thema
            ? <OrgAnsicht d={detail as NonNullable<Awaited<ReturnType<typeof orgDetail>>>} area={area} team={nav.team} me={userId} now={now} />
            : <MatterAnsicht d={detail as NonNullable<Awaited<ReturnType<typeof matterDetail>>>} team={nav.team} me={userId} now={now} />}
        </div>
      ) : sp.id && sp.zu !== '1' ? (
        <div className="ld-detail"><Leer titel="Nicht gefunden." text="Der Eintrag ist weg oder nicht für dich sichtbar." /></div>
      ) : null}
    </div>
  );
}
