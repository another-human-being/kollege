import { expect } from 'vitest';

/** Drizzle wraps Postgres errors; the original message is in `cause`. */
export async function expectRejects(p: Promise<unknown>, pattern: RegExp): Promise<void> {
  const err = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err, 'expected the promise to reject').toBeInstanceOf(Error);
  const e = err as Error & { cause?: Error };
  expect(`${e.message} ${e.cause?.message ?? ''}`).toMatch(pattern);
}

import { randomUUID } from 'node:crypto';
import { withSystem } from '@/lib/db/client';
import { entries, users } from '@/lib/db/schema';

/** Test setup only: users have no action (seed/infrastructure, see STAND.md). */
export async function createUser(name: string): Promise<string> {
  const [u] = await withSystem((tx) =>
    tx.insert(users).values({ name, email: `${name.toLowerCase()}.${randomUUID()}@test.example` }).returning(),
  );
  return u!.id;
}

/** Test setup only: a raw entry as the intake would store it. */
export async function createEntry(values: Partial<typeof entries.$inferInsert> = {}): Promise<string> {
  const [e] = await withSystem((tx) =>
    tx
      .insert(entries)
      .values({ kind: 'note', dedupe_key: randomUUID(), occurred_at: new Date(), visibility: 'team', ...values })
      .returning(),
  );
  return e!.id;
}
