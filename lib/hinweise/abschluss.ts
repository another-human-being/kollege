// Past events close themselves (answer of 09.10.2026): a topic of a dated area (Events) whose day
// is over is set to done by the system – the day after, Berlin time. Its date is date_end, else
// date_start, else the area's first date field ("Datum"). The "Wie lief's?" moment follows from
// the outcome rule. Once only: if anyone changed the status after the day (reopened it), it stays.
import { sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { withSystem } from '@/lib/db/client';
import { berlinDate } from '@/lib/time';

const SYSTEM = { type: 'system' } as const;

export async function vergangeneSchliessen(now = new Date()): Promise<number> {
  const heute = berlinDate(now);
  const faellig = await withSystem(async (tx) => (await tx.execute<{ id: string }>(sql`
    SELECT x.id FROM (
      SELECT m.id, coalesce(
               (m.date_end AT TIME ZONE 'Europe/Berlin')::date,
               (m.date_start AT TIME ZONE 'Europe/Berlin')::date,
               CASE WHEN (m.fields->>(SELECT f->>'key' FROM jsonb_array_elements(a.fields) f WHERE f->>'type' = 'date' LIMIT 1)) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                    THEN left(m.fields->>(SELECT f->>'key' FROM jsonb_array_elements(a.fields) f WHERE f->>'type' = 'date' LIMIT 1), 10)::date END
             ) AS tag
      FROM matters m JOIN areas a ON a.id = m.area_id
      WHERE a.matter_kind = 'dated' AND m.status = 'open' AND m.review_state <> 'discarded') x
    WHERE x.tag < ${heute}::date
      AND NOT EXISTS (SELECT 1 FROM actions s WHERE s.type = 'matter.set_status' AND s.payload->>'id' = x.id::text
                        AND s.undone_at IS NULL AND (s.created_at AT TIME ZONE 'Europe/Berlin')::date > x.tag)`)).rows);
  for (const m of faellig) await runAction(SYSTEM, 'matter.set_status', { id: m.id, status: 'done' });
  return faellig.length;
}
