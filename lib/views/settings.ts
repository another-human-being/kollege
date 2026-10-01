// Einstellungen: Bereiche, Anweisungen, Quellen (status only; connecting sources comes with stage 4).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import type { AreaInfo } from './areas';

export async function settings(userId: string) {
  return withUser(userId, async (tx) => {
    const areas = await tx.execute<Record<string, unknown>>(sql`
      SELECT id, key, name_singular, name_plural, description, matter_kind, fields, phases, sort, actions
      FROM areas ORDER BY sort, name_plural`);
    // personal instructions are restricted to their owner by RLS
    const instructions = await tx.execute<Record<string, unknown>>(sql`
      SELECT e.id, e.body_text AS text, e.instruction_area_id AS area_id, a.name_plural AS area,
             e.instruction_user_id IS NOT NULL AS personal, e.occurred_at
      FROM entries e LEFT JOIN areas a ON a.id = e.instruction_area_id
      WHERE e.kind = 'instruction'
      ORDER BY e.instruction_user_id IS NOT NULL DESC, a.sort NULLS FIRST, e.occurred_at`);
    const sources = await tx.execute<Record<string, unknown>>(sql`
      SELECT c.id, c.kind, c.provider, c.label, c.status, c.last_sync_at, c.last_error, c.user_id IS NULL AS team
      FROM connections c ORDER BY c.user_id IS NULL DESC, c.kind, c.label`);
    return {
      areas: areas.rows as unknown as (AreaInfo & { description: string; sort: number })[],
      instructions: instructions.rows.map((i) => ({
        id: i.id as string,
        text: i.text as string,
        area: (i.area as string) ?? null,
        // personal > area > team (§9.1)
        scope: i.personal ? 'persönlich' : i.area_id ? 'Bereich' : 'Team',
      })),
      sources: sources.rows.map((s) => ({
        id: s.id as string,
        kind: s.kind as string,
        provider: s.provider as string,
        label: s.label as string,
        status: s.status as 'ok' | 'error' | 'disabled',
        team: s.team === true,
        last_error: (s.last_error as string) ?? null,
        last_sync_at: s.last_sync_at ? new Date(s.last_sync_at as string).toISOString() : null,
      })),
    };
  });
}
