// stats (§9.1): only predefined, named queries – never free SQL. Numbers in answers come from here.
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/lib/db/client';

interface Stat<P extends z.ZodType> {
  beschreibung: string;
  params: P;
  run(tx: Tx, p: z.infer<P>, now: Date): Promise<Record<string, unknown>[]>;
}

const stat = <P extends z.ZodType>(s: Stat<P>) => s as unknown as Stat<z.ZodType>;
const Jahr = z.string().regex(/^\d{4}$/);

export const STATS: Record<string, Stat<z.ZodType>> = {
  count_matters_by_phase: stat({
    beschreibung: 'offene Einträge eines Bereichs je Phase; params: {area_key}',
    params: z.object({ area_key: z.string() }),
    async run(tx, p) {
      const r = await tx.execute(sql`
        SELECT coalesce(m.phase, 'ohne Phase') AS phase, count(*)::int AS anzahl
        FROM matters m JOIN areas a ON a.id = m.area_id
        WHERE a.key = ${p.area_key} AND m.status = 'open' AND m.review_state <> 'discarded'
        GROUP BY 1 ORDER BY 2 DESC`);
      return r.rows;
    },
  }),
  count_matters_by_year: stat({
    beschreibung: 'Einträge eines Bereichs je Jahr (nach Datum, sonst Anlage) und Status; params: {area_key}',
    params: z.object({ area_key: z.string() }),
    async run(tx, p) {
      const r = await tx.execute(sql`
        SELECT extract(year FROM coalesce(m.date_start, m.created_at AT TIME ZONE 'Europe/Berlin'))::int AS jahr, m.status, count(*)::int AS anzahl
        FROM matters m JOIN areas a ON a.id = m.area_id
        WHERE a.key = ${p.area_key} AND m.review_state <> 'discarded'
        GROUP BY 1, 2 ORDER BY 1, 2`);
      return r.rows;
    },
  }),
  count_open_tasks: stat({
    beschreibung: 'offene Aufgaben (ours) und Zusagen anderer (theirs), davon überfällig, je zuständiger Person',
    params: z.object({}),
    async run(tx, _p, now) {
      const r = await tx.execute(sql`
        SELECT t.direction, coalesce(u.name, p.name, o.name, 'niemand') AS zustaendig, count(*)::int AS anzahl,
               count(*) FILTER (WHERE t.due_at < ${now})::int AS ueberfaellig
        FROM tasks t LEFT JOIN users u ON u.id = t.owner_user_id LEFT JOIN people p ON p.id = t.owner_person_id
        LEFT JOIN orgs o ON o.id = t.org_id
        WHERE t.status <> 'done' GROUP BY 1, 2 ORDER BY 1, 3 DESC`);
      return r.rows;
    },
  }),
  count_entries_by_kind: stat({
    beschreibung: 'Einträge (Mails, Termine, Dateien, Notizen), die du sehen darfst, je Art in einem Jahr; params: {year}',
    params: z.object({ year: Jahr }),
    async run(tx, p) {
      const r = await tx.execute(sql`
        SELECT kind, count(*)::int AS anzahl FROM entries
        WHERE kind IN ('mail', 'event', 'file', 'note')
          AND extract(year FROM occurred_at AT TIME ZONE 'Europe/Berlin') = ${Number(p.year)}
        GROUP BY 1 ORDER BY 2 DESC`);
      return r.rows;
    },
  }),
  count_founding_teams_by_phase: stat({
    beschreibung: 'Gründungsteams je Phase',
    params: z.object({}),
    async run(tx) {
      const r = await tx.execute(sql`
        SELECT coalesce(phase, 'ohne Phase') AS phase, count(*)::int AS anzahl FROM orgs
        WHERE role = 'founding_team' AND review_state <> 'discarded' AND merged_into_id IS NULL
        GROUP BY 1 ORDER BY 2 DESC`);
      return r.rows;
    },
  }),
};

export const statsNamen = () => Object.entries(STATS).map(([n, s]) => `${n} (${s.beschreibung})`).join('; ');
