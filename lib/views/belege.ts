// What a contact rests on ("Worauf beruht das?"): the entries that mention the person or
// organisation, oldest first – with the person's rights (RLS), so private mail of others stays out –
// and, if Kollege looked on the web, the pages it found.
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';

export interface Beleg {
  id: string;
  art: 'Mail' | 'Termin' | 'Datei' | 'Notiz';
  titel: string;
  am: string;
  von: string | null;
  an: string | null;
  text: string;
  anhaenge: string[];
  href: string;
}

export interface BelegZeile { id: string; art: Beleg['art']; titel: string; am: string }

export const ART: Record<string, Beleg['art']> = { mail: 'Mail', event: 'Termin', file: 'Datei', note: 'Notiz' };

export async function belegeZu(tx: Tx, typ: 'person' | 'org', id: string): Promise<BelegZeile[]> {
  const r = await tx.execute<{ id: string; kind: string; title: string | null; occurred_at: string }>(sql`
    SELECT DISTINCT e.id, e.kind, e.title, e.occurred_at FROM links l JOIN entries e ON e.id = l.entry_id
    WHERE l.target_type = ${typ} AND l.target_id = ${id} AND e.kind IN ('mail', 'event', 'file', 'note')
    ORDER BY e.occurred_at LIMIT 50`);
  return r.rows.map((e) => ({ id: e.id, art: ART[e.kind] ?? 'Notiz', titel: e.title ?? '(ohne Titel)', am: new Date(e.occurred_at).toISOString() }));
}
