// Verlauf (§8.3): strictly chronological, placeholders for entries the user may not read,
// system steps summarised. Notes and files are separate sections of the detail.
import { sql, type SQL } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';

export type TimelineItem =
  | {
      type: 'entry';
      id: string;
      kind: string;
      at: string;
      title: string | null;
      summary: string | null;
      author: string | null;
      /** visible only to the user (restricted to exactly one person) */
      private: boolean;
    }
  | { type: 'stub'; kind: string; at: string; owners: string[] };

export interface EntryRef {
  id: string;
  kind: string;
  at: string;
  title: string | null;
  summary: string | null;
}

const iso = (v: unknown) => new Date(v as string).toISOString();

/** entries linked to the targets selected by `targets` (rows of target_type, target_id) */
export async function timeline(
  tx: Tx,
  targets: { type: 'matter' | 'person' | 'org'; id: string }[],
): Promise<{ items: TimelineItem[]; notes: EntryRef[]; files: EntryRef[]; systemSteps: number }> {
  if (!targets.length) return { items: [], notes: [], files: [], systemSteps: 0 };
  const match: SQL = sql.join(
    targets.map((t) => sql`(l.target_type = ${t.type} AND l.target_id = ${t.id})`),
    sql` OR `,
  );

  const visible = await tx.execute<Record<string, unknown>>(sql`
    SELECT DISTINCT e.id, e.kind, e.occurred_at, e.title, e.summary,
           (e.visibility = 'restricted' AND cardinality(e.visible_to) = 1) AS private,
           coalesce(u.name, p.name, e.meta->'from'->>'name') AS author
    FROM links l JOIN entries e ON e.id = l.entry_id
    LEFT JOIN users u ON u.id = e.author_user_id
    LEFT JOIN people p ON p.id = e.author_person_id
    WHERE ${match}
    ORDER BY e.occurred_at, e.id`);

  const stubs: TimelineItem[] = [];
  for (const t of targets) {
    const r = await tx.execute<Record<string, unknown>>(sql`SELECT * FROM entry_stubs(${t.type}, ${t.id})`);
    for (const s of r.rows) {
      stubs.push({ type: 'stub', kind: s.kind as string, at: iso(s.occurred_at), owners: s.owner_names as string[] });
    }
  }

  // attachments of the visible mails belong to the files of the target
  const mailIds = visible.rows.filter((e) => e.kind === 'mail').map((e) => e.id as string);
  const attachments = mailIds.length
    ? await tx.execute<Record<string, unknown>>(sql`
        SELECT id, kind, occurred_at, title, summary FROM entries
        WHERE meta->>'mail_entry_id' IN (${sql.join(mailIds.map((id) => sql`${id}`), sql`, `)})
        ORDER BY occurred_at`)
    : { rows: [] };

  const steps = await tx.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n FROM links l WHERE (${match}) AND l.origin <> 'human'`);

  const ref = (e: Record<string, unknown>): EntryRef => ({
    id: e.id as string, kind: e.kind as string, at: iso(e.occurred_at), title: (e.title as string) ?? null, summary: (e.summary as string) ?? null,
  });
  const items: TimelineItem[] = visible.rows
    .filter((e) => e.kind !== 'note' && e.kind !== 'file')
    .map((e) => ({
      type: 'entry',
      id: e.id as string,
      kind: e.kind as string,
      at: iso(e.occurred_at),
      title: (e.title as string) ?? null,
      summary: (e.summary as string) ?? null,
      author: (e.author as string) ?? null,
      private: e.private === true,
    }));

  return {
    items: [...items, ...stubs].sort((a, b) => a.at.localeCompare(b.at)),
    notes: visible.rows.filter((e) => e.kind === 'note').map(ref),
    files: [...visible.rows.filter((e) => e.kind === 'file').map(ref), ...attachments.rows.map(ref)],
    systemSteps: steps.rows[0]!.n,
  };
}
