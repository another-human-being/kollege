// Field "Neuer Chat oder Suche" (E55): while typing, hits from records, contacts, mails, files,
// events and tasks – with the person's rights (RLS), so it finds exactly what the pages show.
// Enter does not search: it asks Kollege in a new chat (the hits are not passed on as context).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export interface Treffer { art: 'Eintrag' | 'Kontakt' | 'Mail' | 'Datei' | 'Termin' | 'Aufgabe'; titel: string; unter: string | null; href: string }

const MAX = 6;

export async function schnellsuche(userId: string, q: string): Promise<Treffer[]> {
  const text = q.trim();
  if (text.length < 2) return [];
  const like = `%${text.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const ts = sql`websearch_to_tsquery('german', ${text})`;
  return withUser(userId, async (tx) => {
    const akten = await tx.execute<{ id: string; title: string; area: string }>(sql`
      SELECT m.id, m.title, a.name_singular AS area FROM matters m JOIN areas a ON a.id = m.area_id
      WHERE m.review_state <> 'discarded' AND (m.title ILIKE ${like} OR to_tsvector('german', m.title) @@ ${ts})
      ORDER BY m.status, m.updated_at DESC LIMIT ${MAX}`);
    const kontakte = await tx.execute<{ id: string; name: string; art: 'org' | 'person'; unter: string | null }>(sql`
      (SELECT o.id, o.name, 'org' AS art, NULL AS unter FROM orgs o
       WHERE o.review_state <> 'discarded' AND o.merged_into_id IS NULL AND o.name ILIKE ${like} LIMIT ${MAX})
      UNION ALL
      (SELECT p.id, p.name, 'person', (SELECT o.name FROM orgs o WHERE o.id = p.org_id) FROM people p
       WHERE p.review_state <> 'discarded' AND p.merged_into_id IS NULL
         AND (p.name ILIKE ${like} OR EXISTS (SELECT 1 FROM person_emails pe WHERE pe.person_id = p.id AND pe.email ILIKE ${like})) LIMIT ${MAX})`);
    const eintraege = await tx.execute<{ id: string; kind: string; title: string | null; thread_key: string | null; occurred_at: string }>(sql`
      SELECT e.id, e.kind, e.title, e.thread_key, e.occurred_at FROM entries e
      WHERE e.kind IN ('mail', 'file', 'event') AND (e.search @@ ${ts} OR e.title ILIKE ${like})
        AND NOT (e.kind = 'file' AND e.meta ? 'geloescht')
      ORDER BY ts_rank(e.search, ${ts}) DESC, e.occurred_at DESC LIMIT ${MAX * 2}`);
    const aufgaben = await tx.execute<{ id: string; title: string }>(sql`
      SELECT id, title FROM tasks WHERE status <> 'done' AND title ILIKE ${like} ORDER BY due_at NULLS LAST LIMIT ${MAX}`);
    const tag = (d: string) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' }).format(new Date(d));
    return [
      ...akten.rows.map((m) => ({ art: 'Eintrag' as const, titel: m.title, unter: m.area, href: `/m/${m.id}` })),
      ...kontakte.rows.map((k) => ({ art: 'Kontakt' as const, titel: k.name, unter: k.unter, href: k.art === 'org' ? `/o/${k.id}` : `/p/${k.id}` })),
      ...eintraege.rows.map((e) => e.kind === 'mail'
        ? { art: 'Mail' as const, titel: e.title ?? '(ohne Betreff)', unter: tag(e.occurred_at), href: e.thread_key ? `/mail?t=${encodeURIComponent(e.thread_key)}` : '/mail' }
        : e.kind === 'file'
          ? { art: 'Datei' as const, titel: e.title ?? 'Datei', unter: tag(e.occurred_at), href: `/dateien?d=${e.id}` }
          : { art: 'Termin' as const, titel: e.title ?? 'Termin', unter: tag(e.occurred_at), href: `/kalender?t=${e.id}` }),
      ...aufgaben.rows.map((t) => ({ art: 'Aufgabe' as const, titel: t.title, unter: null, href: `/aufgaben?id=${t.id}` })),
    ].slice(0, 14);
  });
}
