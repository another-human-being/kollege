// The worker runs the initial import through pg-boss and then schedules the syncs.
import { count, eq } from 'drizzle-orm';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, withSystem } from '@/lib/db/client';
import { entries, hints } from '@/lib/db/schema';
import { seed } from '@/lib/db/seed';
import { startJobs } from '@/worker/jobs';
import { NOW, resetDb } from './helpers';

let boss: PgBoss;
beforeAll(async () => {
  await resetDb();
  await seed({ now: NOW });
  boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on('error', (e) => console.error(e));
  await boss.start();
});
afterAll(async () => {
  await boss.stop({ graceful: false });
  await closeDb();
});

async function until(cond: () => Promise<boolean>, ms = 25000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('timeout');
}

describe('worker', () => {
  it('imports fresh connections and schedules their syncs', async () => {
    await startJobs(boss);
    await until(async () => (await withSystem((tx) => tx.select().from(hints).where(eq(hints.kind, 'review_batch')))).length > 0);
    const states = await withSystem((tx) =>
      tx.select({ state: entries.processing_state, n: count() }).from(entries).groupBy(entries.processing_state),
    );
    expect(Object.fromEntries(states.map((s) => [s.state, s.n]))).toEqual({ done: 24 + 3, skipped: 4 }) // 3 attachment entries; m11, m12, m14, e3;
    expect(states.find((s) => s.state === 'pending' || s.state === 'error')).toBeUndefined();
    const schedules = await boss.getSchedules('sync');
    expect(schedules).toHaveLength(8);

    // a scheduled sync finds nothing new: the cursor holds
    const jobId = await boss.send('sync', { connectionId: (schedules[0]!.data as { connectionId: string }).connectionId });
    await until(async () => (await boss.getJobById('sync', jobId!))?.state === 'completed');
  });
});
