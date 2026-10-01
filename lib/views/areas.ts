// Bereichsliste und Detail (§8.3). One template for all areas: columns from areas.fields.
// Founding teams are a special case (§4.3): the list shows orgs with role founding_team,
// their topics are matters with org_id.
import { sql } from 'drizzle-orm';
import { withUser, type Tx } from '@/lib/db/client';
import { timeline, type EntryRef, type NoteRef, type TimelineItem } from './timeline';

/** "hängt" after N days without entry (§8.2). TODO stage 3: N from the area's instruction. */
export const STALE_DAYS = 21;

export interface AreaField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'person' | 'number' | 'select';
  options?: string[];
}

export interface AreaInfo {
  id: string;
  key: string;
  name_singular: string;
  name_plural: string;
  matter_kind: string;
  fields: AreaField[];
  phases: string[];
  actions: string[];
}

export interface AreaFilter {
  phase?: string;
  /** user id or 'none' (nobody responsible) */
  owner?: string;
  status?: 'open' | 'done';
  unreviewed?: boolean;
}

export interface AreaRow {
  type: 'matter' | 'org';
  id: string;
  title: string;
  phase: string | null;
  owner_id: string | null;
  owner: string | null;
  status: 'open' | 'done';
  fields: Record<string, unknown>;
  unreviewed: boolean;
  /** computed (§8.2) */
  waiting: boolean;
  stale: boolean;
  last_activity: string;
}

const iso = (v: unknown) => new Date(v as string).toISOString();

async function loadArea(tx: Tx, key: string): Promise<AreaInfo> {
  const r = await tx.execute<Record<string, unknown>>(sql`
    SELECT id, key, name_singular, name_plural, matter_kind, fields, phases, actions FROM areas WHERE key = ${key}`);
  const a = r.rows[0];
  if (!a) throw new Error(`area ${key} not found`);
  return a as unknown as AreaInfo;
}

export async function areaList(
  userId: string,
  areaKey: string,
  filter: AreaFilter = {},
  now = new Date(),
): Promise<{ area: AreaInfo; rows: AreaRow[]; unreviewedCount: number }> {
  return withUser(userId, async (tx) => {
    const area = await loadArea(tx, areaKey);
    const staleBefore = new Date(now.getTime() - STALE_DAYS * 86_400_000);
    const status = filter.status ?? 'open';
    const owner = filter.owner ?? null;

    if (area.matter_kind === 'org_based') {
      // founding teams: status is derived – an org is "open" while it has an open topic or none at all
      const r = await tx.execute<Record<string, unknown>>(sql`
        SELECT o.id, o.name AS title, o.phase, o.owner_user_id AS owner_id, u.name AS owner, o.fields,
               o.review_state = 'unreviewed' AS unreviewed, act.last_at,
               CASE WHEN EXISTS (SELECT 1 FROM matters m WHERE m.org_id = o.id AND m.status = 'open' AND m.review_state <> 'discarded')
                      OR NOT EXISTS (SELECT 1 FROM matters m WHERE m.org_id = o.id AND m.review_state <> 'discarded')
                    THEN 'open' ELSE 'done' END AS status,
               EXISTS (SELECT 1 FROM matters m WHERE m.org_id = o.id AND m.status = 'open'
                         AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done' AND t.direction = 'ours')
                         AND EXISTS (SELECT 1 FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done' AND t.direction = 'theirs')) AS waiting
        FROM orgs o
        LEFT JOIN users u ON u.id = o.owner_user_id
        JOIN org_last_activity() act ON act.org_id = o.id
        WHERE o.role = 'founding_team' AND o.review_state <> 'discarded' AND o.merged_into_id IS NULL
        ORDER BY act.last_at DESC`);
      const all = r.rows.map((o) => ({
        type: 'org' as const,
        id: o.id as string,
        title: o.title as string,
        phase: (o.phase as string) ?? null,
        owner_id: (o.owner_id as string) ?? null,
        owner: (o.owner as string) ?? null,
        status: o.status as 'open' | 'done',
        fields: (o.fields as Record<string, unknown>) ?? {},
        unreviewed: o.unreviewed === true,
        waiting: o.waiting === true,
        stale: o.status === 'open' && new Date(o.last_at as string) < staleBefore,
        last_activity: iso(o.last_at),
      }));
      return { area, ...applyFilter(all, { ...filter, status }, owner) };
    }

    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT m.id, m.title, m.phase, m.owner_user_id AS owner_id, u.name AS owner, m.status, m.fields,
             m.review_state = 'unreviewed' AS unreviewed, act.last_at,
             (m.status = 'open'
               AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done' AND t.direction = 'ours')
               AND EXISTS (SELECT 1 FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done' AND t.direction = 'theirs')) AS waiting
      FROM matters m
      JOIN areas a ON a.id = m.area_id
      LEFT JOIN users u ON u.id = m.owner_user_id
      JOIN matter_last_activity() act ON act.matter_id = m.id
      WHERE a.key = ${areaKey} AND m.review_state <> 'discarded'
      ORDER BY coalesce(m.date_start, act.last_at) DESC`);
    const all = r.rows.map((m) => ({
      type: 'matter' as const,
      id: m.id as string,
      title: m.title as string,
      phase: (m.phase as string) ?? null,
      owner_id: (m.owner_id as string) ?? null,
      owner: (m.owner as string) ?? null,
      status: m.status as 'open' | 'done',
      fields: m.fields as Record<string, unknown>,
      unreviewed: m.unreviewed === true,
      waiting: m.waiting === true,
      stale: m.status === 'open' && new Date(m.last_at as string) < staleBefore,
      last_activity: iso(m.last_at),
    }));
    return { area, ...applyFilter(all, { ...filter, status }, owner) };
  });
}

function applyFilter(all: AreaRow[], f: AreaFilter, owner: string | null) {
  const rows = all.filter(
    (r) =>
      (!f.status || r.status === f.status) &&
      (!f.phase || r.phase === f.phase) &&
      (!owner || (owner === 'none' ? r.owner_id === null : r.owner_id === owner)) &&
      (!f.unreviewed || r.unreviewed),
  );
  // "ungeprüft · N" counts the whole area, independent of the other filters (E25)
  return { rows, unreviewedCount: all.filter((r) => r.unreviewed).length };
}

export interface MatterDetail {
  id: string;
  title: string;
  area: AreaInfo;
  status: 'open' | 'done';
  phase: string | null;
  owner: { id: string; name: string } | null;
  /** pending handover (E45) */
  handoverTo: { id: string; name: string } | null;
  fields: Record<string, unknown>;
  /** field keys whose value the system set and nobody confirmed yet ("KI-Vermutung") */
  estimated: string[];
  unreviewed: boolean;
  waiting: boolean;
  stale: boolean;
  date_start: string | null;
  date_end: string | null;
  outcome_note: string | null;
  nextStep: { task_id: string; title: string; due_at: string | null } | null;
  commitments: { ours: Commitment[]; theirs: Commitment[] };
  timeline: TimelineItem[];
  systemSteps: number;
  notes: NoteRef[];
  files: EntryRef[];
  references: { type: 'org' | 'matter' | 'person'; id: string; title: string; relation: string }[];
}

export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Commitment {
  id: string;
  title: string;
  owner: string | null;
  due_at: string | null;
  status: TaskStatus;
  overdue: boolean;
  /** placeholder text when the source entry is not readable, e.g. "aus Julias Mail" (E13) */
  source: { entry_id: string; readable: boolean; owners: string[] } | null;
}

export async function commitmentsOf(tx: Tx, where: 'matter' | 'org', id: string, now: Date) {
  const r = await tx.execute<Record<string, unknown>>(sql`
    SELECT t.id, t.title, t.direction, t.status, t.due_at, t.source_entry_id,
           coalesce(u.name, p.name, o.name) AS owner,
           EXISTS (SELECT 1 FROM entries e WHERE e.id = t.source_entry_id) AS readable,
           entry_owner_names(t.source_entry_id) AS owners
    FROM tasks t
    LEFT JOIN users u ON u.id = t.owner_user_id
    LEFT JOIN people p ON p.id = t.owner_person_id
    LEFT JOIN orgs o ON o.id = t.org_id AND t.direction = 'theirs' AND t.owner_person_id IS NULL
    WHERE ${where === 'matter' ? sql`t.matter_id = ${id}` : sql`(t.org_id = ${id} OR t.matter_id IN (SELECT m.id FROM matters m WHERE m.org_id = ${id}))`}
    ORDER BY t.status, t.due_at NULLS LAST`);
  const all = r.rows.map((t) => ({
    direction: t.direction as 'ours' | 'theirs',
    c: {
      id: t.id as string,
      title: t.title as string,
      owner: (t.owner as string) ?? null,
      due_at: t.due_at ? iso(t.due_at) : null,
      status: t.status as TaskStatus,
      overdue: t.status !== 'done' && t.due_at !== null && new Date(t.due_at as string) < now,
      source: t.source_entry_id
        ? { entry_id: t.source_entry_id as string, readable: t.readable === true, owners: (t.owners as string[]) ?? [] }
        : null,
    },
  }));
  return {
    ours: all.filter((x) => x.direction === 'ours').map((x) => x.c),
    theirs: all.filter((x) => x.direction === 'theirs').map((x) => x.c),
  };
}

export async function matterDetail(userId: string, matterId: string, now = new Date()): Promise<MatterDetail | null> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT m.*, a.key AS area_key, u.name AS owner_name, h.name AS handover_name, act.last_at
      FROM matters m JOIN areas a ON a.id = m.area_id
      LEFT JOIN users u ON u.id = m.owner_user_id
      LEFT JOIN users h ON h.id = m.handover_to
      JOIN matter_last_activity() act ON act.matter_id = m.id
      WHERE m.id = ${matterId}`);
    const m = r.rows[0];
    if (!m) return null;
    const area = await loadArea(tx, m.area_key as string);
    const commitments = await commitmentsOf(tx, 'matter', matterId, now);
    const tl = await timeline(tx, [{ type: 'matter', id: matterId }]);

    const refs = await tx.execute<Record<string, unknown>>(sql`
      SELECT 'org' AS type, o.id, o.name AS title, 'gehört zu' AS relation FROM orgs o WHERE o.id = ${m.org_id as string | null}
      UNION ALL SELECT 'matter', p.id, p.title, 'gehört zu' FROM matters p WHERE p.id = ${m.parent_id as string | null}
      UNION ALL SELECT 'matter', c.id, c.title, 'enthält' FROM matters c WHERE c.parent_id = ${matterId}
      UNION ALL SELECT 'matter', v.id, v.title, 'Vorgänger' FROM matters v WHERE v.id = ${m.predecessor_id as string | null}
      UNION ALL SELECT 'matter', n.id, n.title, 'Nachfolger' FROM matters n WHERE n.predecessor_id = ${matterId}
      UNION ALL SELECT DISTINCT 'person', pp.id, pp.name, 'beteiligt' FROM people pp
        WHERE pp.review_state <> 'discarded' AND pp.merged_into_id IS NULL AND pp.id IN (
          SELECT lp.target_id FROM links lp JOIN links lm ON lm.entry_id = lp.entry_id
          WHERE lp.target_type = 'person' AND lm.target_type = 'matter' AND lm.target_id = ${matterId}
          UNION SELECT t.owner_person_id FROM tasks t WHERE t.matter_id = ${matterId})`);

    const open = commitments.ours.filter((c) => c.status !== 'done');
    const next = open.find((c) => c.due_at) ?? open[0] ?? null;
    const status = m.status as 'open' | 'done';
    const fields = m.fields as Record<string, unknown>;
    const unreviewed = m.review_state === 'unreviewed';
    return {
      id: matterId,
      title: m.title as string,
      area,
      status,
      phase: (m.phase as string) ?? null,
      owner: m.owner_user_id ? { id: m.owner_user_id as string, name: m.owner_name as string } : null,
      handoverTo: m.handover_to ? { id: m.handover_to as string, name: m.handover_name as string } : null,
      fields,
      // values set by the system count as KI-Vermutung until the matter is taken over (E5, E32)
      estimated: unreviewed && m.created_by_type === 'system' ? Object.keys(fields) : [],
      unreviewed,
      waiting: status === 'open' && open.length === 0 && commitments.theirs.some((c) => c.status !== 'done'),
      stale: status === 'open' && new Date(m.last_at as string) < new Date(now.getTime() - STALE_DAYS * 86_400_000),
      date_start: m.date_start ? iso(m.date_start) : null,
      date_end: m.date_end ? iso(m.date_end) : null,
      outcome_note: (m.outcome_note as string) ?? null,
      nextStep: next ? { task_id: next.id, title: next.title, due_at: next.due_at } : null,
      commitments,
      timeline: tl.items,
      systemSteps: tl.systemSteps,
      notes: tl.notes,
      files: tl.files,
      references: refs.rows as unknown as MatterDetail['references'],
    };
  });
}
