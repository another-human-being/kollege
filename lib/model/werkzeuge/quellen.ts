// Sources (§9.2.4): every fact the model states points to its entry. Tools hand out
// sources with id, label and link; the chat renders a citation [[id]] only if a tool of
// the same answer returned that id – invented citations stay invisible.
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { tag } from '@/lib/format';

export interface Quelle {
  id: string;
  /** "Mail gestern", "Notiz Julia 24.09.", "Aufgabe 01.10." */
  label: string;
  href: string | null;
}

const ART: Record<string, string> = { mail: 'Mail', event: 'Termin', file: 'Datei', note: 'Notiz', instruction: 'Anweisung', system: 'Eintrag' };

export function hrefFor(type: 'matter' | 'org' | 'person', id: string): string {
  return type === 'matter' ? `/m/${id}` : type === 'org' ? `/o/${id}` : `/p/${id}`;
}

/** sources for visible entries (RLS: invisible ones are simply missing) */
export async function entryQuellen(tx: Tx, ids: string[], now: Date): Promise<Quelle[]> {
  if (!ids.length) return [];
  const r = await tx.execute<{ id: string; kind: string; occurred_at: string; title: string | null; author: string | null; target_type: string | null; target_id: string | null }>(sql`
    SELECT e.id, e.kind, e.occurred_at, e.title, u.name AS author, l.target_type, l.target_id
    FROM entries e
    LEFT JOIN users u ON u.id = e.author_user_id
    LEFT JOIN LATERAL (SELECT target_type, target_id FROM links WHERE entry_id = e.id
                       ORDER BY (target_type = 'matter') DESC, created_at LIMIT 1) l ON true
    WHERE e.id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
  return r.rows.map((e) => ({
    id: e.id,
    label: e.kind === 'file' && e.title
      ? e.title
      : [ART[e.kind] ?? 'Eintrag', e.kind === 'note' ? e.author : null, tag(new Date(e.occurred_at).toISOString(), now)].filter(Boolean).join(' '),
    href: e.kind === 'instruction'
      ? '/einstellungen?reiter=Anweisungen'
      : e.target_type ? hrefFor(e.target_type as 'matter' | 'org' | 'person', e.target_id!) : null,
  }));
}

/** a task without source entry is its own source (created in the app or in a chat) */
export function taskQuelle(t: { id: string; created_at: string; matter_id?: string | null; org_id?: string | null }, now: Date): Quelle {
  return {
    id: t.id,
    label: `Aufgabe ${tag(t.created_at, now)}`,
    href: t.matter_id ? hrefFor('matter', t.matter_id) : t.org_id ? hrefFor('org', t.org_id) : `/aufgaben?id=${t.id}`,
  };
}

/** sources for entry and task ids, read with the user's rights */
export async function quellenFuer(tx: Tx, ids: { entries?: string[]; tasks?: string[] }, now: Date): Promise<Quelle[]> {
  const out = await entryQuellen(tx, [...new Set(ids.entries ?? [])], now);
  const tasks = [...new Set(ids.tasks ?? [])];
  if (tasks.length) {
    const r = await tx.execute<{ id: string; created_at: string; matter_id: string | null; org_id: string | null }>(sql`
      SELECT id, created_at, matter_id, org_id FROM tasks WHERE id IN (${sql.join(tasks.map((i) => sql`${i}`), sql`, `)})`);
    out.push(...r.rows.map((t) => taskQuelle({ ...t, created_at: new Date(t.created_at).toISOString() }, now)));
  }
  return out;
}
