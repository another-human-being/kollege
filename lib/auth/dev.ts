// Dev login without mail (§3): pick a team member by address. Only with NODE_ENV=development.
// The magic link follows once sending mail is settled (stage 4/5, decision 2026-10-01).
import { eq } from 'drizzle-orm';
import { withSystem } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export async function devAuthorize(
  email: unknown,
  env: string | undefined = process.env.NODE_ENV,
): Promise<{ id: string; name: string; email: string } | null> {
  if (env !== 'development') return null;
  if (typeof email !== 'string' || !email.includes('@')) return null;
  // login happens before there is a user context; reads only the users table
  const [u] = await withSystem((tx) => tx.select().from(users).where(eq(users.email, email.trim().toLowerCase())));
  return u ? { id: u.id, name: u.name, email: u.email } : null;
}
