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
