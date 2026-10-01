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

import { sql } from 'drizzle-orm';
import { seed, type SeedResult } from '@/lib/db/seed';
import { runImport, type ImportResult } from '@/lib/pipeline/import';

/** "today" of the fixtures */
export const NOW = new Date('2026-10-01T08:00:00+02:00');

export async function resetDb(): Promise<void> {
  await withSystem((tx) =>
    tx.execute(sql`TRUNCATE users, connections, areas, orgs, people, person_emails, matters, entries,
                   links, tasks, actions, hints, chats, chat_messages CASCADE`),
  );
}

/** Fresh database, seed from fixtures/config.json, import all fixture sources through the intake. */
export async function importFixtures(): Promise<SeedResult & { import: ImportResult }> {
  await resetDb();
  const s = await seed({ now: NOW });
  const result = await runImport(s.connections, { now: NOW, importId: 'fixtures' });
  return { ...s, import: result };
}
