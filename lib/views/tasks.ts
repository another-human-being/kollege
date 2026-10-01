// Aufgaben (E44, E46): one data set for tasks and commitments. ours = we owe it, theirs = owed
// to us ("Wartet auf andere" is computed from the direction). Private tasks only for their owner (RLS).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import type { TaskStatus } from './areas';

export interface TaskFilter {
  direction?: 'ours' | 'theirs';
  /** open = not done (incl. "In Arbeit"); board = open + done within 14 days (E44) */
  status?: 'open' | 'done' | 'board';
  /** mine = ours owned by me, or theirs in matters/teams I am responsible for */
  scope?: 'mine' | 'team';
}

export interface TaskRow {
  id: string;
  title: string;
  direction: 'ours' | 'theirs';
  status: TaskStatus;
  owner: string | null;
  owner_user_id: string | null;
  owner_person_id: string | null;
  due_at: string | null;
  done_at: string | null;
  overdue: boolean;
  private: boolean;
  matter: { id: string; title: string; area: string } | null;
  /** where it was derived from; not readable → only who has it (E13) */
  source: { entry_id: string; readable: boolean; title: string | null; owners: string[] } | null;
}

export async function taskList(userId: string, filter: TaskFilter = {}, now = new Date()): Promise<TaskRow[]> {
  const status = filter.status ?? 'open';
  const since = new Date(now.getTime() - 14 * 86_400_000);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT t.id, t.title, t.direction, t.status, t.due_at, t.done_at, t.visibility = 'private' AS private,
             t.owner_user_id, t.owner_person_id, t.source_entry_id,
             coalesce(u.name, p.name, CASE WHEN t.direction = 'theirs' THEN o.name END) AS owner,
             m.id AS matter_id, m.title AS matter_title, a.name_singular AS area,
             e.title AS source_title, e.id IS NOT NULL AS readable,
             CASE WHEN t.source_entry_id IS NOT NULL THEN entry_owner_names(t.source_entry_id) END AS owners
      FROM tasks t
      LEFT JOIN users u ON u.id = t.owner_user_id
      LEFT JOIN people p ON p.id = t.owner_person_id
      LEFT JOIN orgs o ON o.id = t.org_id
      LEFT JOIN matters m ON m.id = t.matter_id
      LEFT JOIN areas a ON a.id = m.area_id
      LEFT JOIN entries e ON e.id = t.source_entry_id
      WHERE CASE ${status}
              WHEN 'open' THEN t.status <> 'done'
              WHEN 'done' THEN t.status = 'done'
              ELSE t.status <> 'done' OR t.done_at >= ${since} END
        AND (${filter.direction ?? null}::task_direction IS NULL OR t.direction = ${filter.direction ?? null}::task_direction)
        AND (${filter.scope !== 'mine'}
             OR (t.direction = 'ours' AND t.owner_user_id = app_user_id())
             OR (t.direction = 'theirs' AND (m.owner_user_id = app_user_id() OR o.owner_user_id = app_user_id())))
      ORDER BY t.due_at NULLS LAST, t.title`);
    return r.rows.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      direction: t.direction as 'ours' | 'theirs',
      status: t.status as TaskStatus,
      owner: (t.owner as string) ?? null,
      owner_user_id: (t.owner_user_id as string) ?? null,
      owner_person_id: (t.owner_person_id as string) ?? null,
      due_at: t.due_at ? new Date(t.due_at as string).toISOString() : null,
      done_at: t.done_at ? new Date(t.done_at as string).toISOString() : null,
      overdue: t.status !== 'done' && t.due_at !== null && new Date(t.due_at as string) < now,
      private: t.private === true,
      matter: t.matter_id ? { id: t.matter_id as string, title: t.matter_title as string, area: t.area as string } : null,
      source: t.source_entry_id
        ? { entry_id: t.source_entry_id as string, readable: t.readable === true, title: (t.source_title as string) ?? null, owners: (t.owners as string[]) ?? [] }
        : null,
    }));
  });
}
