// Heute (§8.1): open hints, tasks due today or overdue, "wartet auf uns", "wir warten auf",
// today's events. Scope: mine or team. Every item carries its area as label, a reason and its source.
// Runs with the user's rights – only what the user may see.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { berlinDate } from '@/lib/time';
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
}

export interface Today {
  hints: (TodayItem & { kind: string; options: { label: string }[] })[];
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
             m.id AS matter_id, ${AREA_OF_MATTER} AS area_key
      FROM entries e
      LEFT JOIN LATERAL (SELECT l.target_id AS id FROM links l WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) m ON true
      WHERE e.kind = 'event' AND e.occurred_at >= ${startOfDay} AND e.occurred_at < ${endOfDay}
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
      events: events.rows.map((e) => ({
        id: e.entry_id as string,
        title: e.title as string,
        area: (e.area as string) ?? null,
        area_key: (e.area_key as string) ?? null,
        reason: (e.location as string) ?? '',
        matter_id: (e.matter_id as string) ?? null,
        entry_id: e.entry_id as string,
        at: iso(e.occurred_at),
        overdue: false,
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
}

export interface TodayPage {
  clarify: Today['hints'];
  today: TodayItem[];
  waitingOnUs: TodayItem[];
  weWaitFor: TodayItem[];
  stale: MatterItem[];
  handoversToMe: (MatterItem & { from: string | null })[];
  review: Today['hints'];
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

  return {
    clarify: inArea(t.hints.filter((h) => h.kind === 'clarify')),
    today: inArea(today_),
    waitingOnUs: inArea(t.waitingOnUs),
    weWaitFor: inArea(t.weWaitFor),
    stale: inArea(rows.filter((m) => m.owner_id === userId && m.last < staleBefore).map((m) => item(m, quiet(m)))),
    handoversToMe: inArea(
      rows.filter((m) => m.handover_to === userId).map((m) => ({ ...item(m, 'Übergabe an dich – wartet auf Annahme'), from: m.owner })),
    ),
    // the review hint counts everything; per area the list shows its own number (H2)
    review: t.hints.filter((h) => h.kind === 'review_batch'),
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
