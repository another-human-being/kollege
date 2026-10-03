// Kalender (§11.3, E41, E48): events of a period that the user may see – own and team calendars,
// events of others only readable with their owner (E48). Series are expanded for the period.
import { sql } from 'drizzle-orm';
import { vorkommen } from '@/lib/connectors/ical';
import { withUser } from '@/lib/db/client';

export interface KalenderTermin {
  id: string;
  /** occurrence key (id + start): a series shows up several times */
  key: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  versand: string | null;
  serie: boolean;
  /** in a calendar of mine or the team's – editable */
  eigen: boolean;
  /** whose it is, when not mine (E48) */
  besitzer: string[];
  teilnahme: { email: string; name?: string; status: string }[];
  konflikt: string | null;
  fehler: string | null;
  bezug: string | null;
}

export async function kalenderVerbunden(userId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute(sql`SELECT 1 FROM connections WHERE kind = 'calendar' AND provider = 'caldav' AND user_id = ${userId} LIMIT 1`);
    return r.rows.length > 0;
  });
}

export async function termine(userId: string, von: Date, bis: Date): Promise<KalenderTermin[]> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{
      id: string; title: string | null; body_text: string | null; meta: Record<string, unknown>; eigen: boolean; besitzer: string[]; bezug: string | null;
    }>(sql`
      SELECT e.id, e.title, e.body_text, e.meta,
             EXISTS (SELECT 1 FROM event_copies ec JOIN connections c ON c.id = ec.connection_id
                     WHERE ec.entry_id = e.id AND (c.user_id = ${userId} OR c.user_id IS NULL)) AS eigen,
             ARRAY(SELECT u.name FROM users u WHERE u.id = ANY (e.visible_to) AND u.id <> ${userId} ORDER BY u.name) AS besitzer,
             (SELECT coalesce(m.title, o.name) FROM links l LEFT JOIN matters m ON l.target_type = 'matter' AND m.id = l.target_id
                LEFT JOIN orgs o ON l.target_type = 'org' AND o.id = l.target_id
              WHERE l.entry_id = e.id AND l.target_type IN ('matter', 'org') ORDER BY (l.target_type = 'matter') DESC LIMIT 1) AS bezug
      FROM entries e
      WHERE e.kind = 'event' AND coalesce(e.meta->>'status', '') <> 'CANCELLED'
        AND (e.meta->>'recurrence' IS NOT NULL
             OR ((e.meta->>'start')::timestamptz < ${bis} AND (e.meta->>'end')::timestamptz > ${von}))`);
    const out: KalenderTermin[] = [];
    for (const e of r.rows) {
      const m = e.meta as { start: string; end: string; all_day?: boolean; location?: string | null; recurrence?: string | null; exdates?: string[];
        versand?: string; teilnahme?: KalenderTermin['teilnahme']; konflikt?: string; send?: { error?: string } };
      if (!m.start || !m.end) continue;
      for (const v of vorkommen({ start: m.start, end: m.end, rrule: m.recurrence ?? null, exdates: m.exdates }, von, bis)) {
        out.push({
          id: e.id, key: `${e.id}:${v.start}`, title: e.title ?? '(ohne Titel)', start: v.start, end: v.end, allDay: m.all_day === true,
          location: m.location ?? null, notes: e.body_text, versand: m.versand ?? null, serie: !!m.recurrence, eigen: e.eigen,
          besitzer: e.eigen ? [] : e.besitzer, teilnahme: m.teilnahme ?? [], konflikt: m.konflikt ?? null, fehler: m.send?.error ?? null, bezug: e.bezug,
        });
      }
    }
    return out.sort((a, b) => a.start.localeCompare(b.start));
  });
}
