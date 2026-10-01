// §7.2.3 Candidates for the fast model: full text search + fixed matches,
// at most 5 matters, 5 people, 3 organisations. "none of these / new" is always allowed.
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import type { entries } from '@/lib/db/schema';
import type { Fixed } from './assign';

export interface Candidates {
  matters: { id: string; title: string; area_key: string; org_id: string | null; status: string }[];
  people: { id: string; name: string; org_id: string | null; emails: string[] }[];
  orgs: { id: string; name: string; role: string }[];
}

const LIMITS = { matters: 5, people: 5, orgs: 3 };

export async function candidates(tx: Tx, entry: typeof entries.$inferSelect, fixed: Fixed): Promise<Candidates> {
  const uuids = (ids: string[]) => sql`${`{${ids.join(',')}}`}::uuid[]`;
  // fixed matches first, then full text hits; discarded/merged objects never
  const orgs = await tx.execute<Candidates['orgs'][number]>(sql`
    SELECT o.id, o.name, o.role FROM orgs o, entries e
    WHERE e.id = ${entry.id} AND o.merged_into_id IS NULL AND o.review_state <> 'discarded'
      AND (o.id = ANY(${uuids(fixed.orgs)}) OR e.search @@ plainto_tsquery('german', o.name))
    ORDER BY o.id = ANY(${uuids(fixed.orgs)}) DESC, o.updated_at DESC
    LIMIT ${LIMITS.orgs}`);
  const orgIds = orgs.rows.map((o) => o.id);

  const people = await tx.execute<Candidates['people'][number]>(sql`
    SELECT p.id, p.name, p.org_id,
           ARRAY(SELECT pe.email FROM person_emails pe WHERE pe.person_id = p.id ORDER BY pe.email) AS emails
    FROM people p, entries e
    WHERE e.id = ${entry.id} AND p.merged_into_id IS NULL AND p.review_state <> 'discarded'
      AND (p.id = ANY(${uuids(fixed.people)}) OR p.org_id = ANY(${uuids(orgIds)})
           OR e.search @@ plainto_tsquery('german', p.name))
    ORDER BY p.id = ANY(${uuids(fixed.people)}) DESC, p.updated_at DESC
    LIMIT ${LIMITS.people}`);
  const personIds = people.rows.map((p) => p.id);

  const matters = await tx.execute<Candidates['matters'][number]>(sql`
    SELECT m.id, m.title, a.key AS area_key, m.org_id, m.status FROM matters m
    JOIN areas a ON a.id = m.area_id, entries e
    WHERE e.id = ${entry.id} AND m.review_state <> 'discarded'
      AND (m.id = ANY(${uuids(fixed.matters)})
           OR m.org_id = ANY(${uuids(orgIds)})
           OR EXISTS (SELECT 1 FROM links lp JOIN links lm ON lm.entry_id = lp.entry_id
                      WHERE lm.target_type = 'matter' AND lm.target_id = m.id
                        AND ((lp.target_type = 'person' AND lp.target_id = ANY(${uuids(personIds)}))
                          OR (lp.target_type = 'org' AND lp.target_id = ANY(${uuids(orgIds)}))))
           OR e.search @@ plainto_tsquery('german', m.title))
    ORDER BY m.id = ANY(${uuids(fixed.matters)}) DESC, m.status = 'open' DESC, m.updated_at DESC
    LIMIT ${LIMITS.matters}`);

  return { matters: matters.rows, people: people.rows, orgs: orgs.rows };
}
