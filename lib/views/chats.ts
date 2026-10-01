// Chatverlauf (§11, ChatListe) and the state of cards in a chat. Chats are personal (RLS).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { folgenText } from '@/lib/model/werkzeuge/karten';

export interface ChatZeile {
  id: string;
  title: string;
  at: string;
  pinned: boolean;
  /** name of the matter, organisation or person the chat belongs to */
  etikett: string | null;
}

export async function chatListe(userId: string, limit = 30): Promise<ChatZeile[]> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string; title: string | null; updated_at: string; pinned: boolean; etikett: string | null }>(sql`
      SELECT c.id, c.title, c.updated_at, c.pinned,
             coalesce(m.title, o.name, p.name) AS etikett
      FROM chats c
      LEFT JOIN matters m ON c.context_type = 'matter' AND m.id = c.context_id
      LEFT JOIN orgs o ON c.context_type = 'org' AND o.id = c.context_id
      LEFT JOIN people p ON c.context_type = 'person' AND p.id = c.context_id
      ORDER BY c.pinned DESC, c.updated_at DESC
      LIMIT ${limit}`);
    return r.rows.map((c) => ({ id: c.id, title: c.title ?? 'Chat', at: new Date(c.updated_at).toISOString(), pinned: c.pinned, etikett: c.etikett }));
  });
}

export interface KartenStand {
  undone: boolean;
  folgen?: string;
}

/** current state of the actions behind cards (undone elsewhere, follow-ups added later) */
export async function kartenStand(userId: string, actionIds: string[]): Promise<Record<string, KartenStand>> {
  if (!actionIds.length) return {};
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string; undone: boolean }>(sql`
      SELECT id, undone_at IS NOT NULL AS undone FROM actions WHERE id IN (${sql.join(actionIds.map((i) => sql`${i}`), sql`, `)})`);
    const out: Record<string, KartenStand> = {};
    for (const a of r.rows) out[a.id] = { undone: a.undone, folgen: a.undone ? undefined : await folgenText(tx, a.id) };
    return out;
  });
}

/** title from the first sentence: short, without the final full stop (ChatListe) */
export function chatTitel(text: string): string {
  const satz = text.trim().split(/(?<=[.!?])\s|\n/)[0]!.replace(/[.!?]+$/, '').trim();
  return satz.length > 60 ? `${satz.slice(0, 59).trimEnd()}…` : satz || 'Chat';
}
