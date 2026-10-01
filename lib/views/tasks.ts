// Aufgaben: ours and theirs (Zusagen), filterable. Private tasks only for their owner (RLS).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export interface TaskFilter {
  direction?: 'ours' | 'theirs';
  status?: 'open' | 'done';
  /** mine = ours owned by me, or theirs in matters I am responsible for */
  scope?: 'mine' | 'team';
}

export interface TaskRow {
  id: string;
  title: string;
  direction: 'ours' | 'theirs';
  status: 'open' | 'done';
  owner: string | null;
  due_at: string | null;
  overdue: boolean;
  private: boolean;
  matter: { id: string; title: string; area: string } | null;
}

export async function taskList(userId: string, filter: TaskFilter = {}, now = new Date()): Promise<TaskRow[]> {
  const status = filter.status ?? 'open';
  return withUser(userId, async (tx) => {
    const r = await tx.execute<Record<string, unknown>>(sql`
      SELECT t.id, t.title, t.direction, t.status, t.due_at, t.visibility = 'private' AS private,
             coalesce(u.name, p.name, CASE WHEN t.direction = 'theirs' THEN o.name END) AS owner,
             m.id AS matter_id, m.title AS matter_title, a.name_singular AS area
      FROM tasks t
      LEFT JOIN users u ON u.id = t.owner_user_id
      LEFT JOIN people p ON p.id = t.owner_person_id
      LEFT JOIN orgs o ON o.id = t.org_id
      LEFT JOIN matters m ON m.id = t.matter_id
      LEFT JOIN areas a ON a.id = m.area_id
      WHERE t.status = ${status}
        AND (${filter.direction ?? null}::task_direction IS NULL OR t.direction = ${filter.direction ?? null}::task_direction)
        AND (${filter.scope !== 'mine'}
             OR (t.direction = 'ours' AND t.owner_user_id = app_user_id())
             OR (t.direction = 'theirs' AND (m.owner_user_id = app_user_id() OR o.owner_user_id = app_user_id())))
      ORDER BY t.due_at NULLS LAST, t.title`);
    return r.rows.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      direction: t.direction as 'ours' | 'theirs',
      status: t.status as 'open' | 'done',
      owner: (t.owner as string) ?? null,
      due_at: t.due_at ? new Date(t.due_at as string).toISOString() : null,
      overdue: t.status === 'open' && t.due_at !== null && new Date(t.due_at as string) < now,
      private: t.private === true,
      matter: t.matter_id ? { id: t.matter_id as string, title: t.matter_title as string, area: t.area as string } : null,
    }));
  });
}
