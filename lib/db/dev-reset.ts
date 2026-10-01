// Development only: rebuild the database from scratch and import the fixtures
// through the intake (oracle). Usage: npm run dev:reset -- --ja
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { closeDb } from './client';
import { runMigrations } from './migrate';
import { seed } from './seed';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('nicht in Produktion');
  if (!process.argv.includes('--ja')) throw new Error('löscht die Datenbank – mit --ja bestätigen');
  if (process.env.MODEL_FAST !== 'oracle') throw new Error('Testdaten brauchen MODEL_FAST=oracle');
  const url = new URL(process.env.DATABASE_URL!);
  const name = url.pathname.slice(1);
  const admin = new pg.Client({ connectionString: new URL('/postgres', url).toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  await runMigrations();
  const s = await seed();
  const { runImport } = await import('@/lib/pipeline/import');
  const r = await runImport(s.connections);
  console.log(`Neu aufgebaut: ${r.results.size} Einträge verarbeitet, ${r.unreviewed} ungeprüft`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(String(e));
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
