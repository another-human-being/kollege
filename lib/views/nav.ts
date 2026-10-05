// Navigation (E51, E55): areas with their running entries as a tree, who is signed in, the team.
// Running = reviewed, open (topics) or not in an end phase (founding teams: gegründet, ruht).
// The only number is a stock, not news: open tasks of the entry – from the same tasks as /aufgaben.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export interface Ast { titel: string; href: string; id: string; offen: number }
export interface NavBereich { key: string; name_plural: string; eintraege: Ast[]; gesamt: number }

/** at most this many entries per area in the tree, then "Alle N →" */
export const BAUM_MAX = 5;

export async function navigation(userId: string) {
  return withUser(userId, async (tx) => {
    const areas = await tx.execute<{ id: string; key: string; name_plural: string; matter_kind: string }>(sql`
      SELECT id, key, name_plural, matter_kind FROM areas ORDER BY sort, name_plural`);
    const me = await tx.execute<{ name: string }>(sql`SELECT name FROM users WHERE id = app_user_id()`);
    const team = await tx.execute<{ id: string; name: string }>(sql`SELECT id, name FROM users ORDER BY name`);
    const matters = await tx.execute<{ id: string; area_id: string; title: string; offen: number; zuletzt: string }>(sql`
      SELECT m.id, m.area_id, m.title,
             (SELECT count(*)::int FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done') AS offen,
             coalesce((SELECT max(e.occurred_at) FROM links l JOIN entries e ON e.id = l.entry_id
                       WHERE l.target_type = 'matter' AND l.target_id = m.id), m.updated_at) AS zuletzt
      FROM matters m
      WHERE m.status = 'open' AND m.review_state = 'accepted'
      ORDER BY zuletzt DESC`);
    const teams = await tx.execute<{ id: string; name: string; offen: number; zuletzt: string }>(sql`
      SELECT o.id, o.name,
             (SELECT count(*)::int FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id
              WHERE t.status <> 'done' AND (t.org_id = o.id OR m.org_id = o.id)) AS offen,
             o.updated_at AS zuletzt
      FROM orgs o
      WHERE o.role = 'founding_team' AND o.review_state = 'accepted' AND o.merged_into_id IS NULL
        AND coalesce(o.phase, '') NOT IN ('gegründet', 'ruht')
      ORDER BY o.updated_at DESC`);
    const bereiche: NavBereich[] = areas.rows.map((a) => {
      const alle = a.matter_kind === 'org_based'
        ? teams.rows.map((o) => ({ titel: o.name, id: o.id, href: `/b/${a.key}?id=${o.id}`, offen: o.offen }))
        : matters.rows.filter((m) => m.area_id === a.id).map((m) => ({ titel: m.title, id: m.id, href: `/b/${a.key}?id=${m.id}`, offen: m.offen }));
      return { key: a.key, name_plural: a.name_plural, eintraege: alle.slice(0, BAUM_MAX), gesamt: alle.length };
    });
    return { areas: bereiche, me: me.rows[0]?.name ?? '', team: team.rows };
  });
}
