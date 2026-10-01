// Kontakte: people and organisations (address book). An org with role founding_team is
// also the "Beratungsakte" of the founding teams area (E30): its topics, commitments, history.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { commitmentsOf, type Commitment, type TaskStatus } from './areas';
import { timeline, type EntryRef, type NoteRef, type TimelineItem } from './timeline';

export interface ContactRow {
  type: 'person' | 'org';
  id: string;
  name: string;
  /** person: their organisation; org: its role */
  detail: string | null;
  emails: string[];
  unreviewed: boolean;
}

export async function contactList(userId: string, filter: { unreviewed?: boolean } = {}) {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT 'person' AS type, p.id, p.name, o.name AS detail,
             ARRAY(SELECT pe.email FROM person_emails pe WHERE pe.person_id = p.id ORDER BY pe.email) AS emails,
             p.review_state = 'unreviewed' AS unreviewed
      FROM people p LEFT JOIN orgs o ON o.id = p.org_id
      WHERE p.review_state <> 'discarded' AND p.merged_into_id IS NULL
      UNION ALL
      SELECT 'org', o.id, o.name, o.role::text, '{}'::text[], o.review_state = 'unreviewed'
      FROM orgs o WHERE o.review_state <> 'discarded' AND o.merged_into_id IS NULL
      ORDER BY name`);
    const all = r.rows as unknown as ContactRow[];
    return {
      rows: filter.unreviewed ? all.filter((c) => c.unreviewed) : all,
      unreviewedCount: all.filter((c) => c.unreviewed).length,
    };
  });
}

export interface PersonDetail {
  id: string;
  name: string;
  role: string;
  notes: string | null;
  org: { id: string; name: string } | null;
  emails: { email: string; source: string; confirmed: boolean }[];
  unreviewed: boolean;
  matters: { id: string; title: string; area: string }[];
  owes: Commitment[];
  timeline: TimelineItem[];
  systemSteps: number;
  files: EntryRef[];
}

export async function personDetail(userId: string, personId: string, now = new Date()): Promise<PersonDetail | null> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT p.*, o.name AS org_name FROM people p LEFT JOIN orgs o ON o.id = p.org_id WHERE p.id = ${personId}`);
    const p = r.rows[0];
    if (!p) return null;
    const emails = await tx.execute<Record<string, unknown>>(sql`
      SELECT email, source, confirmed FROM person_emails WHERE person_id = ${personId} ORDER BY email`);
    const matters = await tx.execute<Record<string, unknown>>(sql`
      SELECT DISTINCT m.id, m.title, a.name_singular AS area FROM links lp
      JOIN links lm ON lm.entry_id = lp.entry_id AND lm.target_type = 'matter'
      JOIN matters m ON m.id = lm.target_id JOIN areas a ON a.id = m.area_id
      WHERE lp.target_type = 'person' AND lp.target_id = ${personId} AND m.review_state <> 'discarded'
      ORDER BY m.title`);
    const owes = await tx.execute<Record<string, unknown>>(sql`
      SELECT id, title, due_at, status FROM tasks WHERE owner_person_id = ${personId} ORDER BY status, due_at NULLS LAST`);
    const tl = await timeline(tx, [{ type: 'person', id: personId }]);
    return {
      id: personId,
      name: p.name as string,
      role: p.role as string,
      notes: (p.notes as string) ?? null,
      org: p.org_id ? { id: p.org_id as string, name: p.org_name as string } : null,
      emails: emails.rows as unknown as PersonDetail['emails'],
      unreviewed: p.review_state === 'unreviewed',
      matters: matters.rows as unknown as PersonDetail['matters'],
      owes: owes.rows.map((t) => ({
        id: t.id as string,
        title: t.title as string,
        owner: p.name as string,
        due_at: t.due_at ? new Date(t.due_at as string).toISOString() : null,
        status: t.status as TaskStatus,
        overdue: t.status !== 'done' && t.due_at !== null && new Date(t.due_at as string) < now,
        source: null,
      })),
      timeline: tl.items,
      systemSteps: tl.systemSteps,
      files: tl.files,
    };
  });
}

export interface OrgDetail {
  id: string;
  name: string;
  role: string;
  domains: string[];
  phase: string | null;
  fields: Record<string, unknown>;
  owner: { id: string; name: string } | null;
  handoverTo: { id: string; name: string } | null;
  unreviewed: boolean;
  /** newest conversation or entry ("letzter Kontakt", E50) */
  lastContact: string | null;
  people: { id: string; name: string; role: string; emails: string[] }[];
  /** topics (matters with this org) */
  matters: { id: string; title: string; area: string; status: string; unreviewed: boolean }[];
  commitments: { ours: Commitment[]; theirs: Commitment[] };
  timeline: TimelineItem[];
  systemSteps: number;
  notes: NoteRef[];
  files: EntryRef[];
}

export async function orgDetail(userId: string, orgId: string, now = new Date()): Promise<OrgDetail | null> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT o.*, u.name AS owner_name, h.name AS handover_name, act.last_at FROM orgs o
      LEFT JOIN users u ON u.id = o.owner_user_id LEFT JOIN users h ON h.id = o.handover_to
      JOIN org_last_activity() act ON act.org_id = o.id
      WHERE o.id = ${orgId}`);
    const o = r.rows[0];
    if (!o) return null;
    const ppl = await tx.execute<Record<string, unknown>>(sql`
      SELECT p.id, p.name, p.role, ARRAY(SELECT pe.email FROM person_emails pe WHERE pe.person_id = p.id ORDER BY pe.email) AS emails
      FROM people p WHERE p.org_id = ${orgId} AND p.review_state <> 'discarded' AND p.merged_into_id IS NULL ORDER BY p.name`);
    const matters = await tx.execute<Record<string, unknown>>(sql`
      SELECT m.id, m.title, a.name_singular AS area, m.status, m.review_state = 'unreviewed' AS unreviewed
      FROM matters m JOIN areas a ON a.id = m.area_id
      WHERE m.org_id = ${orgId} AND m.review_state <> 'discarded' ORDER BY m.status, m.title`);
    const targets = [
      { type: 'org' as const, id: orgId },
      ...matters.rows.map((m) => ({ type: 'matter' as const, id: m.id as string })),
    ];
    const tl = await timeline(tx, targets);
    return {
      id: orgId,
      name: o.name as string,
      role: o.role as string,
      domains: o.domains as string[],
      phase: (o.phase as string) ?? null,
      fields: o.fields as Record<string, unknown>,
      owner: o.owner_user_id ? { id: o.owner_user_id as string, name: o.owner_name as string } : null,
      handoverTo: o.handover_to ? { id: o.handover_to as string, name: o.handover_name as string } : null,
      unreviewed: o.review_state === 'unreviewed',
      lastContact: o.last_at ? new Date(o.last_at as string).toISOString() : null,
      people: ppl.rows as unknown as OrgDetail['people'],
      matters: matters.rows as unknown as OrgDetail['matters'],
      commitments: await commitmentsOf(tx, 'org', orgId, now),
      timeline: tl.items,
      systemSteps: tl.systemSteps,
      notes: tl.notes,
      files: tl.files,
    };
  });
}
