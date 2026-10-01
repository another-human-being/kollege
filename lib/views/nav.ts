// Navigation: areas (sorted) and who is signed in.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export async function navigation(userId: string) {
  return withUser(userId, async (tx) => {
    const areas = await tx.execute<{ key: string; name_plural: string }>(sql`SELECT key, name_plural FROM areas ORDER BY sort, name_plural`);
    const me = await tx.execute<{ name: string }>(sql`SELECT name FROM users WHERE id = app_user_id()`);
    const team = await tx.execute<{ id: string; name: string }>(sql`SELECT id, name FROM users ORDER BY name`);
    return { areas: areas.rows, me: me.rows[0]?.name ?? '', team: team.rows };
  });
}
