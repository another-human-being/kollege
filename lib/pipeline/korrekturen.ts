// §7.4 Learning from corrections: what people corrected becomes an example for the next
// fast call – the last 20 relevant ones, read straight from the action log (no copy).
//   review.discard (with reason)  "… angelegt als X – verworfen: Grund"
//   entry.relink                  "… nicht zu A, sondern zu B"
//   entry.unlink                  "… gehört nicht zu A"
// Only corrections by people, not undone. Privacy: an example may only go into a call if
// everybody who can read the current entry can read the example's entry, too.
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import type { entries } from '@/lib/db/schema';
import { senderOf } from './participants';

export const MAX_BEISPIELE = 20;

type Row = {
  type: string;
  reason: string | null;
  payload: Record<string, unknown>;
  inverse: { op: string; set?: Record<string, unknown>; row?: Record<string, unknown> }[];
  entry_id: string;
  entry_title: string | null;
  entry_kind: string;
  sender: string | null;
  same_sender: boolean;
};

const ZIEL = sql`CASE t.type WHEN 'matter' THEN (SELECT a.name_singular || ' „' || m.title || '“' FROM matters m JOIN areas a ON a.id = m.area_id WHERE m.id = t.id)
                         WHEN 'org' THEN (SELECT 'Organisation „' || o.name || '“' FROM orgs o WHERE o.id = t.id)
                         WHEN 'person' THEN (SELECT 'Person „' || p.name || '“' FROM people p WHERE p.id = t.id) END`;

async function zielName(tx: Tx, type: unknown, id: unknown): Promise<string> {
  if (typeof type !== 'string' || typeof id !== 'string') return '?';
  const r = await tx.execute<{ n: string | null }>(sql`SELECT ${ZIEL} AS n FROM (SELECT ${type}::text AS type, ${id}::uuid AS id) t`);
  return r.rows[0]?.n ?? '?';
}

export async function korrekturBeispiele(tx: Tx, entry: typeof entries.$inferSelect): Promise<string[]> {
  const sender = senderOf(entry)?.email ?? '';
  const domain = sender.split('@')[1] ?? '';
  // which entry each correction is about
  const r = await tx.execute<Row>(sql`
    WITH k AS (
      SELECT a.type, a.payload, a.inverse, a.created_at, NULL::jsonb AS item,
             CASE a.type WHEN 'entry.unlink' THEN (a.inverse->0->'row'->>'entry_id')::uuid
                         ELSE (SELECT l.entry_id FROM links l WHERE l.id = (a.payload->>'link_id')::uuid) END AS entry_id
      FROM actions a
      WHERE a.actor_type = 'user' AND a.undone_at IS NULL AND a.type IN ('entry.unlink', 'entry.relink')
      UNION ALL
      -- every discarded object of a bulk discard is an example; its entry is where the system created it
      SELECT a.type, a.payload, a.inverse, a.created_at, i.item,
             (SELECT l.entry_id FROM links l WHERE l.target_id = (i.item->>'id')::uuid AND l.origin <> 'human'
              ORDER BY l.created_at LIMIT 1)
      FROM actions a, jsonb_array_elements(a.payload->'items') AS i(item)
      WHERE a.actor_type = 'user' AND a.undone_at IS NULL AND a.type = 'review.discard' AND a.payload->>'reason' IS NOT NULL
    )
    SELECT k.type, k.payload->>'reason' AS reason, k.payload || jsonb_build_object('item', k.item) AS payload, k.inverse,
           e.id AS entry_id, e.title AS entry_title, e.kind AS entry_kind, e.meta->'from'->>'email' AS sender,
           coalesce(e.meta->'from'->>'email' = ${sender} OR split_part(e.meta->'from'->>'email', '@', 2) = ${domain}, false) AS same_sender
    FROM k JOIN entries e ON e.id = k.entry_id
    WHERE e.id <> ${entry.id}
      AND (e.visibility = 'team'
           OR (${entry.visibility}::entry_visibility = 'restricted' AND ${`{${entry.visible_to.join(',')}}`}::uuid[] <@ e.visible_to))
    ORDER BY same_sender DESC, k.created_at DESC
    LIMIT ${MAX_BEISPIELE}`);

  const out: string[] = [];
  for (const k of r.rows) {
    const was = `${k.entry_kind === 'mail' ? 'Mail' : k.entry_kind === 'event' ? 'Termin' : 'Datei'} „${k.entry_title ?? '–'}“${k.sender ? ` von ${k.sender}` : ''}`;
    if (k.type === 'review.discard') {
      const item = k.payload.item as { type: string; id: string } | null;
      out.push(`${was}: angelegt als ${await zielName(tx, item?.type, item?.id)} – verworfen${k.reason ? `: ${k.reason}` : ''}`);
    } else if (k.type === 'entry.relink') {
      const vorher = k.inverse[0]?.set ?? {};
      out.push(`${was}: nicht zu ${await zielName(tx, vorher.target_type, vorher.target_id)}, sondern zu ${await zielName(tx, k.payload.target_type, k.payload.target_id)}`);
    } else {
      const row = k.inverse[0]?.row ?? {};
      out.push(`${was}: gehört nicht zu ${await zielName(tx, row.target_type, row.target_id)}`);
    }
  }
  return out;
}
