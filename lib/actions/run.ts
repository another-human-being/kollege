// runAction / undoAction – BAUVORLAGE §6.
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { withSystem, withUser, type Tx } from '@/lib/db/client';
import { actions } from '@/lib/db/schema';
import { getAction } from './registry';
import { ActionError, UNDOABLE_TABLES, type Actor, type InverseOp } from './types';

export interface RunOptions {
  /** run inside an existing transaction (e.g. all steps of one pipeline run) */
  tx?: Tx;
  parentActionId?: string;
  /** justification, e.g. the quote a task was derived from */
  reason?: string;
  appliedInstructionIds?: string[];
  chatId?: string;
}

export async function runAction<R = unknown>(
  actor: Actor,
  type: string,
  payload: unknown,
  opts: RunOptions = {},
): Promise<{ actionId: string; result: R }> {
  const def = getAction(type);
  if (!def) throw new ActionError(`unknown action: ${type}`);
  // hard rule, independent of allowedActors: the model never acts externally
  if (def.external && actor.type === 'model') {
    throw new ActionError(`actor model may not run external action ${type}`);
  }
  if (!def.allowedActors.includes(actor.type)) {
    throw new ActionError(`actor ${actor.type} may not run ${type}`);
  }
  const parsed: unknown = def.schema.parse(payload);

  const exec = async (tx: Tx) => {
    const actionId = randomUUID();
    await tx.insert(actions).values({
      id: actionId,
      created_at: sql`clock_timestamp()`,
      actor_type: actor.type,
      actor_user_id: actor.type === 'system' ? null : actor.userId,
      type,
      payload: parsed,
      parent_action_id: opts.parentActionId,
      reason: opts.reason,
      applied_instruction_ids: opts.appliedInstructionIds ?? [],
      chat_id: opts.chatId,
    });
    const { result, inverse } = await def.apply(tx, parsed, { actor, actionId });
    if (inverse) await tx.update(actions).set({ inverse }).where(eq(actions.id, actionId));
    return { actionId, result: result as R };
  };

  if (opts.tx) {
    await assertContext(opts.tx, actor);
    return opts.tx.transaction(exec);
  }
  return actor.type === 'system' ? withSystem(exec) : withUser(actor.userId, exec);
}

/** A passed-in transaction must run with the rights of the actor. */
async function assertContext(tx: Tx, actor: Actor): Promise<void> {
  const r = await tx.execute<{ role: string; uid: string | null }>(
    sql`SELECT current_user AS role, app_user_id() AS uid`,
  );
  const { role, uid } = r.rows[0]!;
  const ok = actor.type === 'system' ? role !== 'kollege_app' : role === 'kollege_app' && uid === actor.userId;
  if (!ok) throw new ActionError(`transaction context does not match actor ${actor.type}`);
}

/**
 * Undo an action of the given user: first all children (youngest first),
 * then the action itself. Runs with the user's rights.
 */
export async function undoAction(actionId: string, userId: string): Promise<void> {
  await withUser(userId, (tx) => undoInTx(tx, actionId, userId));
}

async function undoInTx(tx: Tx, actionId: string, userId: string): Promise<void> {
  const [action] = await tx.select().from(actions).where(eq(actions.id, actionId));
  if (!action) throw new ActionError(`action ${actionId} not found`);
  if (action.undone_at) throw new ActionError(`action ${actionId} already undone`);
  if (!action.inverse) throw new ActionError(`action ${action.type} cannot be undone`);

  const children = await tx
    .select({ id: actions.id })
    .from(actions)
    .where(and(eq(actions.parent_action_id, actionId), isNull(actions.undone_at)))
    .orderBy(desc(actions.created_at));
  for (const child of children) await undoInTx(tx, child.id, userId);

  for (const op of action.inverse as InverseOp[]) await applyInverse(tx, op);
  await tx.update(actions).set({ undone_at: sql`clock_timestamp()`, undone_by: userId }).where(eq(actions.id, actionId));
}

async function applyInverse(tx: Tx, op: InverseOp): Promise<void> {
  if (!UNDOABLE_TABLES.includes(op.table)) throw new ActionError(`inverse on table ${op.table} not allowed`);
  const table = sql.identifier(op.table);
  let res;
  if (op.op === 'delete') {
    res = await tx.execute(sql`DELETE FROM ${table} WHERE id = ${op.id}`);
  } else {
    const cols = Object.keys(op.set);
    if (cols.length === 0 || !cols.every((c) => /^[a-z_]+$/.test(c))) throw new ActionError('invalid inverse columns');
    const list = sql.join(cols.map((c) => sql.identifier(c)), sql`, `);
    res = await tx.execute(sql`
      UPDATE ${table} SET (${list}) = (
        SELECT ${list} FROM jsonb_populate_record(NULL::${table}, ${JSON.stringify(op.set)}::jsonb)
      ) WHERE id = ${op.id}`);
  }
  if (res.rowCount !== 1) throw new ActionError(`inverse ${op.op} on ${op.table} ${op.id} affected ${res.rowCount} rows`);
}
