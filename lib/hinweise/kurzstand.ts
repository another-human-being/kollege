// The state of a topic at a handover (Denkweise 7): next step, open commitments, last event.
// Shared by the hint rule (system) and Heute (the person) – both say the same. The last event is
// only one the recipient may read: a private mail of the previous owner stays private.
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';

const ddmm = (d: string) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' }).format(new Date(d));

export async function kurzstand(tx: Tx, matterId: string, fuer: string): Promise<string> {
  const [m] = (await tx.execute<{ schritt: string | null; offen: number; zuletzt: string | null; zuletzt_at: string | null }>(sql`
    SELECT (SELECT t.title FROM tasks t WHERE t.matter_id = ${matterId} AND t.direction = 'ours' AND t.status <> 'done' ORDER BY t.due_at NULLS LAST LIMIT 1) AS schritt,
           (SELECT count(*)::int FROM tasks t WHERE t.matter_id = ${matterId} AND t.status <> 'done') AS offen,
           z.title AS zuletzt, z.occurred_at AS zuletzt_at
    FROM (SELECT 1) x
    LEFT JOIN LATERAL (SELECT e.title, e.occurred_at FROM links l JOIN entries e ON e.id = l.entry_id
                       WHERE l.target_type = 'matter' AND l.target_id = ${matterId}
                         AND (e.visibility = 'team' OR ${fuer}::uuid = ANY (e.visible_to))
                       ORDER BY e.occurred_at DESC LIMIT 1) z ON true`)).rows;
  return [
    `Nächster Schritt: ${m?.schritt ?? 'keiner eingetragen'}`,
    `offene Zusagen: ${m?.offen ?? 0}`,
    m?.zuletzt_at ? `zuletzt: ${m.zuletzt ?? 'Eintrag'} (${ddmm(m.zuletzt_at)})` : null,
  ].filter(Boolean).join(' · ');
}
