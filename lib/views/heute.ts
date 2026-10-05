// Heute (E56, E57): Diese Woche · Offen (Entscheiden / Erledigen) · Ausstehend with Wiedervorlage.
// The same facts as before, ordered by what to do instead of where they came from. Built on
// todayPage (stage 2/8), so hints keep their memory ("Später", done by hand) and the personal
// instructions about hints apply.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { addDays, berlinDate, berlinWeekStart, werktagPlus } from '@/lib/time';
import { termine, type KalenderTermin } from './kalender';
import { todayPage, type TodayPage } from './today';

type Grund = { art: 'belegt' | 'berechnet' | 'einschaetzung'; text: string; quelle?: string; dringend?: boolean };

export type PunktArt = 'frage' | 'hand' | 'senden' | 'rat' | 'aufgabe' | 'antworten' | 'nachtragen' | 'rueckblick' | 'haengt' | 'pruefen' | 'nachfassen' | 'ausstehend';

export interface Punkt {
  key: string;
  art: PunktArt;
  /** a sentence with a verb (design: "Antwort an Karin Vogt freigeben") */
  titel: string;
  von?: string;
  bezug?: string;
  /** date on the right: "heute", "Do", "seit Di", "–" */
  f: string;
  fArt?: 'ue' | 'h';
  gruende: Grund[];
  hintId?: string;
  /** buttons of a question or advice (answered with answer(hint, index)) */
  optionen?: string[];
  taskId?: string;
  matterId?: string;
  entwurfId?: string;
  /** "Was kam raus?" / "Wie lief's?": answered in words */
  festhalten?: boolean;
  links: { label: string; href: string }[];
  /** circle to check off (tasks only) */
  kreis: boolean;
  /** Ausstehend: "erwartet bis" and the computed Wiedervorlage */
  bis?: string;
  wv?: string;
  wvNah?: boolean;
  sort: string;
}

export interface Tag { tag: string; datum: string; heute: boolean; ende: boolean; termine: (KalenderTermin & { vorbei: boolean })[]; jetzt: string | null; fristen: { text: string; mein: boolean; wv?: boolean }[] }

export interface Heute {
  kopf: { datum: string; termine: number; offen: number; ueber: number; ausstehend: number };
  woche: Tag[];
  entscheiden: Punkt[];
  erledigen: Punkt[];
  ausstehend: Punkt[];
}

const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const wtag = (d: string) => WT[new Date(`${d}T12:00:00Z`).getUTCDay()]!;
const ddmm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
const uhr = (iso: string) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/** the date column of a row: today, a weekday this week, "seit Di" when overdue */
export function datumLabel(iso: string | null, heute: string): { f: string; fArt?: 'ue' | 'h' } {
  if (!iso) return { f: '–' };
  const d = berlinDate(new Date(iso));
  if (d === heute) return { f: 'heute', fArt: 'h' };
  const tage = Math.round((new Date(`${d}T12:00:00Z`).getTime() - new Date(`${heute}T12:00:00Z`).getTime()) / 86_400_000);
  // another year needs its year, or "seit 28.11." reads as this November
  const datum = d.slice(0, 4) === heute.slice(0, 4) ? ddmm(d) : `${ddmm(d)}${d.slice(2, 4)}`;
  if (tage < 0) return { f: tage >= -6 ? `seit ${wtag(d)}` : `seit ${datum}`, fArt: 'ue' };
  return { f: tage <= 6 ? wtag(d) : datum };
}

/** E57: with a deadline the working day after it; without one 5 working days of silence */
export function wiedervorlage(bis: string | null, seit: string): string {
  return bis ? werktagPlus(berlinDate(new Date(bis)), 1) : werktagPlus(berlinDate(new Date(seit)), 5);
}

export async function heute(userId: string, now = new Date()): Promise<Heute> {
  const p: TodayPage = await todayPage(userId, now);
  const tagHeute = berlinDate(now);
  const sonntag = addDays(berlinWeekStart(now), 6);
  // at least four days ahead, so that Friday or the weekend still show a useful week
  const bisTag = addDays(tagHeute, 4) > sonntag ? addDays(tagHeute, 4) : sonntag;

  const extra = await withUser(userId, async (tx) => {
    // our tasks due after today until the end of the shown week (today/overdue come from todayPage)
    const woche = await tx.execute<{ id: string; title: string; due_at: string; bezug: string | null; matter_id: string | null }>(sql`
      SELECT t.id, t.title, t.due_at, m.title AS bezug, t.matter_id FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id
      WHERE t.direction = 'ours' AND t.status <> 'done' AND t.owner_user_id = app_user_id()
        AND t.due_at >= ((${addDays(tagHeute, 1)})::date::timestamp AT TIME ZONE 'Europe/Berlin')
        AND t.due_at < ((${addDays(bisTag, 1)})::date::timestamp AT TIME ZONE 'Europe/Berlin')
      ORDER BY t.due_at`);
    const ihre = await tx.execute<{ id: string; created_at: string; wer: string | null; bezug: string | null }>(sql`
      SELECT t.id, t.created_at, coalesce(pe.name, o.name) AS wer, coalesce(m.title, o.name) AS bezug FROM tasks t
      LEFT JOIN people pe ON pe.id = t.owner_person_id LEFT JOIN orgs o ON o.id = coalesce(t.org_id, pe.org_id)
      LEFT JOIN matters m ON m.id = t.matter_id
      WHERE t.id = ANY (${`{${p.weWaitFor.map((w) => w.id).join(',')}}`}::uuid[])`);
    // drafts Kollege prepared and the person has not sent yet: "freigeben" (E43, E56)
    const freigeben = await tx.execute<{ id: string; title: string | null; an: string | null; updated_at: string }>(sql`
      SELECT e.id, e.title, e.meta->'to'->0->>'email' AS an, e.updated_at FROM entries e
      WHERE e.kind = 'draft' AND e.author_user_id = app_user_id() AND (e.meta->>'by_model')::boolean
        AND coalesce(e.meta->'send'->>'status', 'entwurf') = 'entwurf'
      ORDER BY e.updated_at DESC LIMIT 10`);
    const threads = await tx.execute<{ id: string; thread_key: string | null }>(sql`
      SELECT id, thread_key FROM entries WHERE id = ANY (${`{${p.waitingOnUs.map((w) => w.id).join(',')}}`}::uuid[])`);
    return { woche: woche.rows, ihre: new Map(ihre.rows.map((r) => [r.id, r])), freigeben: freigeben.rows, threads: new Map(threads.rows.map((r) => [r.id, r.thread_key])) };
  });

  const L = (iso: string | null) => datumLabel(iso, tagHeute);
  const entscheiden: Punkt[] = [];
  const erledigen: Punkt[] = [];
  const ausstehend: Punkt[] = [];

  for (const h of p.clarify) {
    entscheiden.push({ key: `h:${h.id}`, art: 'frage', titel: h.title, ...L(h.at), gruende: h.reason ? [{ art: 'einschaetzung', text: h.reason }] : [],
      hintId: h.id, optionen: h.options.map((o) => o.label), links: h.href ? [{ label: h.source?.kind === 'mail' || h.source?.kind === 'file' ? 'Öffnen und zuordnen' : 'Öffnen', href: h.href }] : [], kreis: false, sort: `0${h.at}` });
  }
  for (const m of p.handoversToMe) {
    entscheiden.push({ key: `u:${m.id}`, art: 'hand', titel: `Übergabe von ${m.from ?? 'jemandem'} annehmen`, bezug: m.title, f: '–',
      gruende: [{ art: 'berechnet', text: m.reason }], hintId: m.hintId, matterId: m.id, links: [{ label: 'Öffnen', href: `/m/${m.id}` }], kreis: false, sort: '1' });
  }
  for (const m of p.team.unowned) {
    entscheiden.push({ key: `z:${m.id}`, art: 'hand', titel: `${m.title} zuordnen`, bezug: m.area, f: '–',
      gruende: [{ art: 'berechnet', text: 'neu, niemand zuständig' }], matterId: m.id, links: [{ label: 'Öffnen', href: `/m/${m.id}` }], kreis: false, sort: `2${m.last_activity}` });
  }
  for (const d of extra.freigeben) {
    entscheiden.push({ key: `d:${d.id}`, art: 'senden', titel: `Antwort${d.an ? ` an ${d.an}` : ''} freigeben`, bezug: d.title ?? undefined, ...L(d.updated_at),
      gruende: [{ art: 'einschaetzung', text: 'Kollege hat den Entwurf vorbereitet – senden entscheidest du' }], entwurfId: d.id,
      links: [{ label: 'Entwurf ansehen', href: `/mail?entwurf=${d.id}` }], kreis: false, sort: `3${d.updated_at}` });
  }
  for (const h of p.momente.filter((x) => x.kind === 'advice')) {
    entscheiden.push({ key: `r:${h.id}`, art: 'rat', titel: h.title, bezug: h.area ?? undefined, ...L(h.at),
      gruende: h.reason ? h.reason.split(' · ').map((t) => ({ art: 'belegt' as const, text: t })) : [], hintId: h.id, optionen: h.options.map((o) => o.label),
      links: h.matter_id ? [{ label: 'Öffnen', href: `/m/${h.matter_id}` }] : [], kreis: false, sort: `4${h.at}` });
  }

  for (const t of p.today.filter((i) => !i.termin)) {
    erledigen.push({ key: `t:${t.id}`, art: 'aufgabe', titel: t.title, bezug: t.area ?? undefined, ...L(t.at),
      gruende: [{ art: 'berechnet', text: t.overdue ? 'überfällig' : 'heute fällig', dringend: t.overdue }], hintId: t.hintId, taskId: t.id,
      links: t.matter_id ? [{ label: 'Öffnen', href: `/m/${t.matter_id}` }] : [], kreis: true, sort: `0${t.at}` });
  }
  for (const t of extra.woche) {
    erledigen.push({ key: `t:${t.id}`, art: 'aufgabe', titel: t.title, bezug: t.bezug ?? undefined, ...L(t.due_at), gruende: [{ art: 'berechnet', text: `fällig ${wtag(berlinDate(new Date(t.due_at)))}` }],
      taskId: t.id, links: t.matter_id ? [{ label: 'Öffnen', href: `/m/${t.matter_id}` }] : [], kreis: true, sort: `1${t.due_at}` });
  }
  for (const w of p.waitingOnUs) {
    // a received mail is not overdue: its day stays neutral (attention only for what is overdue, E3/E42)
    erledigen.push({ key: `w:${w.id}`, art: 'antworten', titel: `${w.reason.replace(/ wartet auf Antwort$/, '')} antworten`, bezug: w.title,
      f: L(w.at).f.replace(/^seit /, ''),
      gruende: [{ art: 'belegt', text: w.reason, quelle: `Mail ${ddmm(berlinDate(new Date(w.at!)))}` }], hintId: w.hintId,
      links: [{ label: 'In Mail antworten', href: extra.threads.get(w.id) ? `/mail?t=${encodeURIComponent(extra.threads.get(w.id)!)}` : '/mail' }], kreis: false, sort: `2${w.at}` });
  }
  for (const h of p.momente.filter((x) => x.kind === 'after_event' || x.kind === 'outcome')) {
    erledigen.push({ key: `m:${h.id}`, art: h.kind === 'outcome' ? 'rueckblick' : 'nachtragen', titel: h.title, bezug: h.area ?? undefined, ...L(h.at),
      gruende: h.reason ? [{ art: h.kind === 'outcome' ? 'berechnet' : 'belegt', text: h.reason, quelle: h.kind === 'after_event' ? 'Kalender' : undefined }] : [],
      hintId: h.id, optionen: h.options.map((o) => o.label), festhalten: true, links: [], kreis: false, sort: `3${h.at}` });
  }
  for (const m of p.stale) {
    erledigen.push({ key: `s:${m.id}`, art: 'haengt', titel: `${m.title} voranbringen`, bezug: m.area, ...L(m.last_activity),
      gruende: [{ art: 'berechnet', text: m.reason }], hintId: m.hintId, matterId: m.id, links: [{ label: 'Öffnen', href: `/m/${m.id}` }], kreis: false, sort: `4${m.last_activity}` });
  }
  const pruefen = p.reviewCounts.reduce((n, c) => n + c.n, 0);
  if (pruefen) {
    const erster = p.reviewCounts[0]!;
    erledigen.push({ key: 'pruefen', art: 'pruefen', titel: 'Vom System Angelegtes prüfen', bezug: `${pruefen} offen`, f: '–',
      gruende: [{ art: 'berechnet', text: p.reviewCounts.map((c) => `${c.label} ${c.n}`).join(' · ') }],
      links: p.reviewCounts.map((c) => ({ label: `${c.label} prüfen`, href: c.href })), kreis: false, sort: `9${erster.key}` });
  }

  for (const w of p.weWaitFor) {
    const x = extra.ihre.get(w.id);
    const wv = wiedervorlage(w.at, x?.created_at ?? now.toISOString());
    const faellig = wv <= tagHeute;
    const punkt: Punkt = {
      key: `a:${w.id}`, art: faellig ? 'nachfassen' : 'ausstehend', titel: faellig ? `Bei ${x?.wer ?? 'ihnen'} nachfassen: ${w.title}` : w.title,
      von: x?.wer ? `von ${x.wer}` : undefined, bezug: x?.bezug ?? w.area ?? undefined, f: w.at ? L(w.at).f : '–', fArt: w.overdue ? 'ue' : undefined,
      gruende: [{ art: 'belegt', text: w.reason }, { art: 'berechnet', text: w.at ? `Wiedervorlage = Werktag nach der Frist, nur wenn nichts gekommen ist` : 'Wiedervorlage = 5 Werktage ohne Antwort' }],
      hintId: w.hintId, taskId: w.id, links: w.matter_id ? [{ label: 'Öffnen', href: `/m/${w.matter_id}` }] : [], kreis: false,
      bis: w.at ? `${wtag(berlinDate(new Date(w.at)))} ${ddmm(berlinDate(new Date(w.at)))}` : '–', wv: `${wtag(wv)} ${ddmm(wv)}`, wvNah: wv <= addDays(tagHeute, 1), sort: faellig ? `5${wv}` : wv,
    };
    // E57: when the Wiedervorlage has come, following up is the person's task – it moves to Offen
    (faellig ? erledigen : ausstehend).push(punkt);
  }

  // Diese Woche: today to Sunday (at least four days), the weekend in one column
  const ereignisse = await termine(userId, new Date(`${tagHeute}T00:00:00Z`), new Date(`${addDays(bisTag, 1)}T23:59:59Z`));
  const tage: string[] = [];
  for (let d = tagHeute; d <= bisTag; d = addDays(d, 1)) tage.push(d);
  const woche: Tag[] = [];
  for (const d of tage) {
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (wd === 0 && woche.length && woche.at(-1)!.ende) continue; // Sunday joins Saturday's column
    const gruppe = wd === 6 && tage.includes(addDays(d, 1)) ? [d, addDays(d, 1)] : [d];
    const imTag = (iso: string) => gruppe.includes(berlinDate(new Date(iso)));
    const ts = ereignisse.filter((t) => imTag(t.start)).map((t) => ({ ...t, vorbei: new Date(t.end) < now }));
    const fristen = [
      ...[...p.today.filter((i) => !i.termin), ...extra.woche.map((t) => ({ title: t.title, at: t.due_at }))].filter((t) => t.at && imTag(t.at)).map((t) => ({ text: t.title, mein: true })),
      ...p.weWaitFor.filter((w) => w.at && imTag(w.at)).map((w) => ({ text: `${w.title} erwartet`, mein: false })),
      ...ausstehend.filter((a) => a.sort && gruppe.includes(a.sort)).map((a) => ({ text: `Wiedervorlage ${a.bezug ?? a.titel}`, mein: false, wv: true })),
    ];
    woche.push({
      tag: d === tagHeute ? 'Heute' : gruppe.length > 1 ? 'Sa–So' : wtag(d), datum: gruppe.length > 1 ? `${ddmm(d).slice(0, 3)}–${ddmm(gruppe[1]!)}` : `${d === tagHeute ? `${wtag(d)} ` : ''}${ddmm(d)}`,
      heute: d === tagHeute, ende: wd === 6 || wd === 0, termine: ts, jetzt: d === tagHeute ? uhr(now.toISOString()) : null, fristen,
    });
  }

  const sortiert = (xs: Punkt[]) => xs.sort((a, b) => a.sort.localeCompare(b.sort));
  const offen = entscheiden.length + erledigen.length;
  return {
    kopf: {
      datum: new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' }).format(now),
      termine: woche[0]?.termine.length ?? 0, offen, ueber: erledigen.filter((e) => e.fArt === 'ue').length, ausstehend: ausstehend.length,
    },
    woche,
    entscheiden: sortiert(entscheiden),
    erledigen: sortiert(erledigen),
    ausstehend: sortiert(ausstehend),
  };
}
