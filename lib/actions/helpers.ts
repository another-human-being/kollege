import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Tx } from '@/lib/db/client';
import { ActionError, type Actor, type InverseOp, type UndoableTable } from './types';

/** Objects created by system or model start unreviewed (§6). */
export function reviewStateFor(actor: Actor): 'accepted' | 'unreviewed' {
  return actor.type === 'user' ? 'accepted' : 'unreviewed';
}

export const ALL_ACTORS = ['user', 'system', 'model'] as const;


type TableWithId = PgTable & { id: PgColumn };

/**
 * Update columns of one row and return the inverse (previous values of exactly
 * these columns). Column keys equal the database column names in our schema.
 */
export async function updateWithInverse(
  tx: Tx,
  table: TableWithId,
  name: UndoableTable,
  id: string,
  set: Record<string, unknown>,
): Promise<InverseOp> {
  const [row] = (await tx.select().from(table as PgTable).where(eq(table.id, id))) as Record<string, unknown>[];
  if (!row) throw new ActionError(`${name} ${id} not found`);
  const previous = Object.fromEntries(Object.keys(set).map((k) => [k, row[k] ?? null]));
  // RLS skips rows silently (readable but not writable, e.g. links of an entry one cannot see)
  const changed = await tx.update(table).set(set).where(eq(table.id, id)).returning({ id: table.id });
  if (changed.length !== 1) throw new ActionError(`${name} ${id} not found or not allowed`);
  return { op: 'update', table: name, id, set: previous };
}

/** Delete one row and return the inverse that restores it. */
export async function deleteWithInverse(tx: Tx, table: TableWithId, name: UndoableTable, id: string): Promise<InverseOp> {
  const [row] = (await tx.select().from(table as PgTable).where(eq(table.id, id))) as Record<string, unknown>[];
  if (!row) throw new ActionError(`${name} ${id} not found`);
  const gone = await tx.delete(table).where(eq(table.id, id)).returning({ id: table.id });
  if (gone.length !== 1) throw new ActionError(`${name} ${id} not found or not allowed`);
  const { search: _generated, ...restorable } = row;
  return { op: 'insert', table: name, row: restorable as Record<string, unknown> & { id: string } };
}

/** Only the keys that were actually given (undefined = leave unchanged). */
export function defined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
