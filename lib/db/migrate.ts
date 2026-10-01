import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDb, getDb } from './client';

export const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => console.log('Migrationen angewendet'))
    .finally(() => closeDb());
}
