// Fresh test database per test run: drop, create, migrate.
import pg from 'pg';

const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgres://kollege:kollege@localhost:5432/kollege_test');

export default async function setup(): Promise<void> {
  const dbName = url.pathname.slice(1);
  const admin = new pg.Client({ connectionString: new URL('/postgres', url).toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  process.env.DATABASE_URL = url.toString();
  const { runMigrations } = await import('../lib/db/migrate');
  const { closeDb } = await import('../lib/db/client');
  await runMigrations();
  await closeDb();
}
