// Database connection. Two ways in:
//  - withUser(userId, fn): app context. Switches to role kollege_app and sets
//    app.user_id for this transaction, so RLS applies (BAUVORLAGE §5).
//  - withSystem(fn): worker context. Runs as the table owner, RLS does not apply.
//    Only the worker and the seed use it; data changes still go through runAction.
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

let pool: pg.Pool | undefined;
let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({ connectionString: url, max: 10 });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE kollege_app`);
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn);
}
