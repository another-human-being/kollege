import { PgBoss } from 'pg-boss';
import { closeDb } from '@/lib/db/client';
import { runMigrations } from '@/lib/db/migrate';
import { startJobs } from './jobs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  await runMigrations();
  const boss = new PgBoss(url);
  boss.on('error', (e) => console.error('[worker]', e));
  await boss.start();
  await startJobs(boss);
  console.log('[worker] bereit');

  const stop = async () => {
    await boss.stop();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
