// Heute (§8.1): open hints, tasks due today or overdue, "wartet auf uns", "wir warten auf",
// today's events. Scope: mine or team. Every item carries its area as label, a reason and its source.
// Runs with the user's rights – only what the user may see.
import { sql } from 'drizzle-orm';
import { vorkommen } from '@/lib/connectors/ical';
import { withUser } from '@/lib/db/client';
import { berlinDate } from '@/lib/time';
import { HinweisRegel, verborgen } from '@/lib/actions/instruction';
import { kurzstand } from '@/lib/hinweise/kurzstand';
import { schluessel } from '@/lib/hinweise/schluessel';
import { STALE_DAYS } from './areas';

export type Scope = 'mine' | 'team';

export interface TodayItem {
  id: string;
  title: string;
  /** area label (name_singular), null = no area */
  area: string | null;
  /** area key for the area filter */
  area_key: string | null;
  /** why it is here – a computed statement */
  reason: string;
  /** where it comes from: matter/entry the item belongs to */
  matter_id: string | null;
  entry_id: string | null;
  /** ISO timestamp relevant for sorting (due date, received, start) */
  at: string | null;
  overdue: boolean;
  /** the hint behind this item (stage 8) – for "Später" */
  hintId?: string;
  /** an event of today (time column shows the clock time; everything else its day) */
  termin?: boolean;
}

export interface Today {
  hints: (TodayItem & { kind: string; options: { label: string }[]; source: { kind: string; at: string } | null; href: string | null })[];
  due: TodayItem[];
  waitingOnUs: TodayItem[];
  weWaitFor: TodayItem[];
  events: TodayItem[];
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

/** area label of a matter: name_singular */
const AREA_OF_MATTER = sql`(SELECT a.name_singular FROM matters mm JOIN areas a ON a.id = mm.area_id WHERE mm.id = m.id) AS area,
  (SELECT a.key FROM matters mm JOIN areas a ON a.id = mm.area_id WHERE mm.id = m.id)`;

export async function today(userId: string, scope: Scope, now = new Date()): Promise<Today> {
  const day = berlinDate(now);
  const endOfDay = sql`((${day}::date + 1)::timestamp AT TIME ZONE 'Europe/Berlin')`;
  const startOfDay = sql`(${day}::date::timestamp AT TIME ZONE 'Europe/Berlin')`;
  const mine = scope === 'mine';

  return withUser(userId, async (tx) => {
    const hints = await tx.execute<Record<string, unknown>>(sql`
      SELECT h.id, h.kind, h.text AS title, h.reason, h.options, h.target_type, h.target_id, h.created_at,
             (SELECT e.occurred_at FROM entries e WHERE h.target_type = 'entry' AND e.id = h.target_id) AS source_at,
             (SELECT e.kind FROM entries e WHERE h.target_type = 'entry' AND e.id = h.target_id) AS source_kind,
             (SELECT e.thread_key FROM entries e WHERE h.target_type = 'entry' AND e.id = h.target_id) AS source_thread,
             a.name_singular AS area, a.key AS area_key,
             CASE WHEN h.target_type = 'matter' THEN h.target_id END AS matter_id,
             CASE WHEN h.target_type = 'entry' THEN h.target_id END AS entry_id
      FROM hints h LEFT JOIN areas a ON a.id = h.area_id
      WHERE h.status = 'open' AND (h.show_from IS NULL OR h.show_from <= ${now})
        AND (${!mine} OR h.user_id = app_user_id() OR h.kind = 'review_batch'
             OR (h.target_type = 'matter' AND EXISTS (SELECT 1 FROM matters x WHERE x.id = h.target_id AND x.owner_user_id = app_user_id())))
      ORDER BY h.created_at`);

    const due = await tx.execute<Record<string, unknown>>(sql`
      SELECT t.id, t.title, t.due_at, t.matter_id, t.source_entry_id AS entry_id, m.title AS matter_title, ${AREA_OF_MATTER} AS area_key
      FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id
      WHERE t.direction = 'ours' AND t.status <> 'done' AND t.due_at < ${endOfDay}
        AND (${!mine} OR t.owner_user_id = app_user_id())
      ORDER BY t.due_at`);

    const waiting = await tx.execute<Record<string, unknown>>(sql`
      SELECT e.id AS entry_id, e.title, e.occurred_at, e.meta->'from'->>'name' AS sender,
             m.id AS matter_id, ${AREA_OF_MATTER} AS area_key
      FROM waiting_on_us(${now}) w
      JOIN entries e ON e.id = w.entry_id
      LEFT JOIN LATERAL (SELECT l.target_id AS id FROM links l WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) m ON true
      WHERE (${!mine} OR app_user_id() = ANY (e.visible_to))
      ORDER BY e.occurred_at`);

    const theirs = await tx.execute<Record<string, unknown>>(sql`
      SELECT t.id, t.title, t.due_at, t.matter_id, t.source_entry_id AS entry_id, ${AREA_OF_MATTER} AS area_key,
             coalesce(p.name, o.name) AS owed_by
      FROM tasks t
      LEFT JOIN matters m ON m.id = t.matter_id
      LEFT JOIN people p ON p.id = t.owner_person_id
      LEFT JOIN orgs o ON o.id = t.org_id
      WHERE t.direction = 'theirs' AND t.status <> 'done'
        AND (${!mine} OR m.owner_user_id = app_user_id() OR o.owner_user_id = app_user_id())
      ORDER BY t.due_at NULLS LAST`);

    const events = await tx.execute<Record<string, unknown>>(sql`
      SELECT e.id AS entry_id, e.title, e.occurred_at, e.meta->>'location' AS location,
             e.meta->>'start' AS start, e.meta->>'end' AS end, e.meta->>'recurrence' AS rrule, e.meta->'exdates' AS exdates,
             ${startOfDay} AS day_start, ${endOfDay} AS day_end,
             m.id AS matter_id, ${AREA_OF_MATTER} AS area_key
      FROM entries e
      LEFT JOIN LATERAL (SELECT l.target_id AS id FROM links l WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) m ON true
      WHERE e.kind = 'event' AND coalesce(e.meta->>'status', '') <> 'CANCELLED'
        AND ((e.occurred_at >= ${startOfDay} AND e.occurred_at < ${endOfDay}) OR e.meta->>'recurrence' IS NOT NULL)
        AND (${!mine} OR app_user_id() = ANY (e.visible_to))
      ORDER BY e.occurred_at`);

    const overdue = (at: unknown) => at !== null && new Date(at as string) < now;

    return {
      hints: hints.rows.map((h) => ({
        id: h.id as string,
        kind: h.kind as string,
        title: h.title as string,
        area: (h.area as string) ?? null,
        area_key: (h.area_key as string) ?? null,
        reason: (h.reason as string) ?? '',
        matter_id: (h.matter_id as string) ?? null,
        entry_id: (h.entry_id as string) ?? null,
        at: iso(h.created_at),
        overdue: false,
        options: ((h.options as { label: string }[]) ?? []).map((o) => ({ label: o.label })),
        // the evidence is the entry, not the moment the hint was created
        source: h.source_at ? { kind: h.source_kind as string, at: iso(h.source_at)! } : null,
        // where the question can be answered when no button fits ("Gehört zu", a new topic)
        href: h.target_type === 'matter' ? `/m/${h.target_id as string}`
          : h.source_kind === 'mail' && h.source_thread ? `/mail?t=${encodeURIComponent(h.source_thread as string)}`
          : h.source_kind === 'file' ? `/dateien?d=${h.target_id as string}`
          : h.source_kind === 'event' ? `/kalender?t=${h.target_id as string}` : null,
      })),
      due: due.rows.map((t) => ({
        id: t.id as string,
        title: t.title as string,
        area: (t.area as string) ?? null,
        area_key: (t.area_key as string) ?? null,
        reason: overdue(t.due_at) ? 'überfällig' : 'heute fällig',
        matter_id: (t.matter_id as string) ?? null,
        entry_id: (t.entry_id as string) ?? null,
        at: iso(t.due_at),
        overdue: overdue(t.due_at),
      })),
      waitingOnUs: waiting.rows.map((w) => ({
        id: w.entry_id as string,
        title: w.title as string,
        area: (w.area as string) ?? null,
        area_key: (w.area_key as string) ?? null,
        reason: `${(w.sender as string) ?? 'Extern'} wartet auf Antwort`,
        matter_id: (w.matter_id as string) ?? null,
        entry_id: w.entry_id as string,
        at: iso(w.occurred_at),
        overdue: false,
      })),
      weWaitFor: theirs.rows.map((t) => ({
        id: t.id as string,
        title: t.title as string,
        area: (t.area as string) ?? null,
        area_key: (t.area_key as string) ?? null,
        reason: t.owed_by ? `zugesagt von ${t.owed_by as string}` : 'Zusage',
        matter_id: (t.matter_id as string) ?? null,
        entry_id: (t.entry_id as string) ?? null,
        at: iso(t.due_at),
        overdue: overdue(t.due_at),
      })),
      // series (RRULE) appear on every day they occur, not only on their first
      events: events.rows.flatMap((e) => {
        if (!e.rrule) return [e];
        if (!e.start || !e.end) return [];
        const v = vorkommen({ start: e.start as string, end: e.end as string, rrule: e.rrule as string, exdates: (e.exdates as string[] | null) ?? [] },
          new Date(e.day_start as string), new Date(e.day_end as string))
          .find((x) => new Date(x.start) >= new Date(e.day_start as string));
        return v ? [{ ...e, occurred_at: v.start }] : [];
      }).sort((a, b) => String(iso(a.occurred_at)).localeCompare(String(iso(b.occurred_at)))).map((e) => ({
        id: e.entry_id as string,
        title: e.title as string,
        area: (e.area as string) ?? null,
        area_key: (e.area_key as string) ?? null,
        reason: (e.location as string) ?? '',
        matter_id: (e.matter_id as string) ?? null,
        entry_id: e.entry_id as string,
        at: iso(e.occurred_at),
        overdue: false,
        termin: true,
      })),
    };
  });
}

// --- page "Heute" after E39: always my items, below "Im Team" with two kinds only ---------


export interface MatterItem {
  id: string;
  title: string;
  area: string;
  area_key: string;
  owner: string | null;
  last_activity: string;
  reason: string;
  hintId?: string;
}

export interface TodayPage {
  clarify: Today['hints'];
  today: TodayItem[];
  waitingOnUs: TodayItem[];
  weWaitFor: TodayItem[];
  stale: MatterItem[];
  handoversToMe: (MatterItem & { from: string | null })[];
  /** moments (§10): "Was kam raus?", "Wie lief's?", advice from earlier cases */
  momente: Today['hints'];
  review: Today['hints'];
  /** live count of unreviewed items per area and for contacts (H2) */
  reviewCounts: { key: string; label: string; href: string; n: number }[];
  team: { unowned: MatterItem[]; stuckAtOthers: MatterItem[] };
}

const days = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / 86_400_000);

export async function todayPage(userId: string, now = new Date(), areaKey?: string): Promise<TodayPage> {
  const t = await today(userId, 'mine', now);
  const staleBefore = new Date(now.getTime() - STALE_DAYS * 86_400_000);

  const matterRows = await withUser(userId, async (tx) =>
    tx.execute<Record<string, unknown>>(sql`
      SELECT m.id, m.title, m.owner_user_id, m.handover_to, u.name AS owner, a.name_singular AS area, a.key AS area_key,
             act.last_at, m.review_state,
             EXISTS (SELECT 1 FROM tasks t WHERE t.matter_id = m.id AND t.direction = 'ours'
                       AND t.status <> 'done' AND t.due_at < ${now}) AS overdue
      FROM matters m JOIN areas a ON a.id = m.area_id
      LEFT JOIN users u ON u.id = m.owner_user_id
      JOIN matter_last_activity() act ON act.matter_id = m.id
      WHERE m.status = 'open' AND m.review_state <> 'discarded'
      ORDER BY act.last_at`),
  );
  const rows = matterRows.rows.map((m) => ({
    id: m.id as string,
    title: m.title as string,
    area: m.area as string,
    area_key: m.area_key as string,
    owner_id: (m.owner_user_id as string) ?? null,
    owner: (m.owner as string) ?? null,
    handover_to: (m.handover_to as string) ?? null,
    last: new Date(m.last_at as string),
    overdue: m.overdue === true,
  }));
  const item = (m: (typeof rows)[number], reason: string): MatterItem => ({
    id: m.id, title: m.title, area: m.area, area_key: m.area_key, owner: m.owner, last_activity: m.last.toISOString(), reason,
  });
  const quiet = (m: (typeof rows)[number]) => `seit ${days(m.last, now)} Tagen nichts passiert`;

  const inArea = <T extends { area_key: string | null }>(xs: T[]) => (areaKey ? xs.filter((x) => x.area_key === areaKey) : xs);
  const today_ = [...t.due, ...t.events].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));

  const counts = await withUser(userId, (tx) =>
    tx.execute<{ key: string; label: string; n: number }>(sql`
      SELECT a.key, a.name_plural AS label, a.sort,
             CASE WHEN a.matter_kind = 'org_based'
                  THEN (SELECT count(*) FROM orgs o WHERE o.role = 'founding_team' AND o.review_state = 'unreviewed' AND o.merged_into_id IS NULL)
                     + (SELECT count(*) FROM matters m WHERE m.area_id = a.id AND m.review_state = 'unreviewed')
                  ELSE (SELECT count(*) FROM matters m WHERE m.area_id = a.id AND m.review_state = 'unreviewed') END::int AS n
      FROM areas a
      UNION ALL
      SELECT 'contacts', 'Kontakte', 1000,
             ((SELECT count(*) FROM people p WHERE p.review_state = 'unreviewed' AND p.merged_into_id IS NULL)
            + (SELECT count(*) FROM orgs o WHERE o.role <> 'founding_team' AND o.review_state = 'unreviewed' AND o.merged_into_id IS NULL))::int
      ORDER BY sort`),
  );
  const reviewCounts = counts.rows
    .filter((c) => c.n > 0 && (!areaKey || c.key === areaKey))
    .map((c) => ({ ...c, href: c.key === 'contacts' ? '/kontakte?ungeprueft=1' : `/b/${c.key}?ungeprueft=1` }));

  // the hint rows are the memory of the live items (decision 40): put off ("Später") or done by
  // hand, an item stays out of sight; otherwise it carries its hint for "Später"
  const stale = rows.filter((m) => m.owner_id === userId && m.last < staleBefore).map((m) => item(m, quiet(m)));
  // the state of things comes with the handover (Denkweise 7), the same text as the hint's
  const handovers = await Promise.all(rows.filter((m) => m.handover_to === userId).map(async (m) => ({
    ...item(m, await withUser(userId, (tx) => kurzstand(tx, m.id, userId))), from: m.owner })));
  const keys = new Map<object, string[]>();
  for (const i of today_) if (i.overdue && i.at && !i.termin) keys.set(i, [schluessel.overdue(i.id, new Date(i.at))]);
  for (const i of t.waitingOnUs) keys.set(i, [schluessel.mail(i.id, userId), schluessel.mail(i.id, null)]);
  for (const i of t.weWaitFor) if (i.overdue && i.at) keys.set(i, [schluessel.zusage(i.id, new Date(i.at))]);
  for (const m of stale) keys.set(m, [schluessel.stale(m.id, new Date(m.last_activity))]);
  for (const m of handovers) keys.set(m, [schluessel.handover(m.id, userId)]);
  const alle = [...keys.values()].flat();
  const zustand = new Map((await withUser(userId, (tx) => tx.execute<{ id: string; dedupe_key: string; status: string; show_from: string | null }>(sql`
    SELECT id, dedupe_key, status, show_from FROM hints WHERE dedupe_key = ANY (${pgArray(alle)}::text[])`))).rows.map((h) => [h.dedupe_key, h]));
  const sichtbar = <T extends object>(xs: T[]): (T & { hintId?: string })[] => xs.flatMap((x) => {
    const h = (keys.get(x) ?? []).map((k) => zustand.get(k)).find(Boolean);
    if (!h) return [x];
    if (h.status !== 'open' || (h.show_from && new Date(h.show_from) > now)) return [];
    return [{ ...x, hintId: h.id }];
  });

  // personal instructions about hints ("Social-Media-Hinweise nur montags", decision 42)
  const regeln = (await withUser(userId, (tx) => tx.execute<{ r: unknown }>(sql`
    SELECT meta->'hinweise' AS r FROM entries WHERE kind = 'instruction' AND instruction_user_id = ${userId} AND meta ? 'hinweise'`)))
    .rows.flatMap((x) => { const r = HinweisRegel.safeParse(x.r); return r.success ? [r.data] : []; });
  const wochentag = ((new Date(`${berlinDate(now)}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const zeigen = <T extends { area_key: string | null }>(art: string, xs: T[], gilt: (x: T) => boolean = () => true) =>
    xs.filter((x) => !gilt(x) || !verborgen(regeln, art, x.area_key, wochentag));
  const hinweisArt = <T extends { kind: string; area_key: string | null }>(xs: T[]) => xs.filter((x) => zeigen(x.kind, [x]).length > 0);

  return {
    reviewCounts,
    clarify: inArea(hinweisArt(t.hints.filter((h) => h.kind === 'clarify'))),
    // only overdue tasks are hints; what is due today and today's events always show
    today: inArea(zeigen('overdue', sichtbar(today_), (i) => i.overdue && !i.termin)),
    waitingOnUs: inArea(zeigen('waiting', sichtbar(t.waitingOnUs))),
    weWaitFor: inArea(zeigen('waiting', sichtbar(t.weWaitFor))),
    stale: inArea(zeigen('stale', sichtbar(stale))),
    handoversToMe: inArea(zeigen('handover', sichtbar(handovers))),
    momente: inArea(hinweisArt(t.hints.filter((h) => h.kind === 'after_event' || h.kind === 'outcome' || h.kind === 'advice'))),
    // the review hint counts everything; per area the list shows its own number (H2)
    review: hinweisArt(t.hints.filter((h) => h.kind === 'review_batch')),
    team: {
      unowned: inArea(rows.filter((m) => m.owner_id === null).map((m) => item(m, 'neu, niemand zuständig'))),
      stuckAtOthers: inArea(
        rows
          .filter((m) => m.owner_id !== null && m.owner_id !== userId && (m.last < staleBefore || m.overdue))
          .map((m) => item(m, m.overdue ? 'Aufgabe überfällig' : quiet(m))),
      ),
    },
  };
}

/** a text[] literal for ANY(...) */
function pgArray(xs: string[]): string {
  return `{${xs.map((x) => `"${x.replace(/(["\\])/g, '\\$1')}"`).join(',')}}`;
}
