// The person's devices with push notifications (Einstellungen → Benachrichtigungen). RLS: own only.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { vapidOeffentlich } from '@/lib/push/senden';

export type Geraet = { id: string; label: string; seit: string; endpoint_hash: string };

export async function benachrichtigungen(userId: string): Promise<{ schluessel: string | null; geraete: Geraet[] }> {
  const geraete = await withUser(userId, async (tx) => (await tx.execute<Geraet>(sql`
    SELECT id, label, created_at AS seit, endpoint_hash FROM push_subscriptions ORDER BY created_at`)).rows);
  return { schluessel: vapidOeffentlich(), geraete: geraete.map((g) => ({ ...g, seit: new Date(g.seit).toISOString() })) };
}
