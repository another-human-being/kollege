import type { z } from 'zod';
import type { Tx } from '@/lib/db/client';

export type ActorType = 'user' | 'system' | 'model';

/** model acts on behalf of a user and with that user's rights (§9.1). */
export type Actor = { type: 'user'; userId: string } | { type: 'model'; userId: string } | { type: 'system' };

/** Tables an inverse may touch. */
export const UNDOABLE_TABLES = [
  'areas', 'orgs', 'people', 'person_emails', 'matters', 'entries', 'links', 'tasks', 'hints', 'mail_copies',
] as const;
export type UndoableTable = (typeof UNDOABLE_TABLES)[number];

export type InverseOp =
  | { op: 'delete'; table: UndoableTable; id: string }
  | { op: 'update'; table: UndoableTable; id: string; set: Record<string, unknown> }
  /** restore a deleted row (only the given columns; generated columns are left out) */
  | { op: 'insert'; table: UndoableTable; row: Record<string, unknown> & { id: string } };

export interface ActionContext {
  actor: Actor;
  actionId: string;
}

export interface ActionDef<S extends z.ZodType = z.ZodType, R = unknown> {
  type: string;
  schema: S;
  /** writes to the outside world (mail.send, invitations). Never allowed for actor model. */
  external: boolean;
  allowedActors: readonly ActorType[];
  /** inverse null = not undoable */
  apply(tx: Tx, payload: z.infer<S>, ctx: ActionContext): Promise<{ result: R; inverse: InverseOp[] | null }>;
}

export class ActionError extends Error {}
