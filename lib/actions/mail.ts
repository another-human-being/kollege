// Mail (§6, stage 5). Drafts are entries of kind 'draft' (only their author sees them);
// sending turns the draft into the sent mail. mail.send is external: never the model
// (runAction refuses), and it is undoable only while the mail waits its 10 s (E43) –
// the send job removes the inverse the moment the mail goes out (lib/mail/senden.ts).
// Read state and archive change the actor's own copies (mail_copies); the worker writes
// them back to the mailbox.
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/lib/db/client';
import { connections, entries, mailCopies } from '@/lib/db/schema';
import { deleteWithInverse, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError, type ActionContext, type InverseOp } from './types';

/** seconds a sent mail waits and can be recalled (E43) */
export const ZURUECKHOLBAR_S = 10;

const Anhang = z.object({ blob_path: z.string().regex(/^[0-9a-f]{64}$/), filename: z.string().min(1), mime: z.string().min(1) });

export const EntwurfMeta = z.object({
  connection_id: z.uuid(),
  to: z.array(z.email()).default([]),
  cc: z.array(z.email()).default([]),
  bcc: z.array(z.email()).default([]),
  /** the mail this answers or forwards */
  bezug_entry_id: z.uuid().optional(),
  art: z.enum(['neu', 'antwort', 'weiterleitung']).default('neu'),
  attachments: z.array(Anhang).default([]),
  by_model: z.boolean().default(false),
  send: z.object({
    status: z.enum(['queued', 'failed']),
    message_id: z.string(),
    send_after: z.string(),
    error: z.string().optional(),
  }).optional(),
});
export type EntwurfMeta = z.infer<typeof EntwurfMeta>;

const userOf = (ctx: ActionContext) => {
  if (ctx.actor.type === 'system') throw new ActionError('mail is written by people');
  return ctx.actor.userId;
};

/** a mailbox the actor may write from: their own or the team mailbox */
async function assertMailbox(tx: Tx, connectionId: string, userId: string) {
  const [c] = await tx
    .select({ id: connections.id })
    .from(connections)
    .where(and(eq(connections.id, connectionId), eq(connections.kind, 'mail'), or(eq(connections.user_id, userId), isNull(connections.user_id))));
  if (!c) throw new ActionError('mailbox not found or not yours');
}

async function loadDraft(tx: Tx, id: string) {
  const [e] = await tx.select().from(entries).where(and(eq(entries.id, id), eq(entries.kind, 'draft')));
  if (!e) throw new ActionError(`draft ${id} not found`);
  return e;
}

export const mailDraft = defineAction({
  type: 'mail.draft',
  schema: z.object({
    /** absent = new draft */
    id: z.uuid().optional(),
    connection_id: z.uuid(),
    to: z.array(z.email()).default([]),
    cc: z.array(z.email()).default([]),
    bcc: z.array(z.email()).default([]),
    subject: z.string().max(500).default(''),
    body: z.string().max(200_000).default(''),
    bezug_entry_id: z.uuid().optional(),
    art: z.enum(['neu', 'antwort', 'weiterleitung']).default('neu'),
    attachments: z.array(Anhang).default([]),
  }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id, subject, body, ...p }, ctx) {
    const me = userOf(ctx);
    await assertMailbox(tx, p.connection_id, me);
    if (p.bezug_entry_id) {
      const [b] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.id, p.bezug_entry_id), eq(entries.kind, 'mail')));
      if (!b) throw new ActionError('mail to answer not found');
    }
    if (id) {
      const d = await loadDraft(tx, id);
      const old = EntwurfMeta.parse(d.meta);
      if (old.send?.status === 'queued') throw new ActionError('mail is being sent');
      const meta = EntwurfMeta.parse({ ...p, by_model: old.by_model });
      return { result: { id }, inverse: [await updateWithInverse(tx, entries, 'entries', id, { title: subject, body_text: body, meta })] };
    }
    const meta = EntwurfMeta.parse({ ...p, by_model: ctx.actor.type === 'model' });
    const [e] = await tx
      .insert(entries)
      .values({
        kind: 'draft',
        dedupe_key: `draft:${randomUUID()}`,
        occurred_at: new Date(),
        author_user_id: me,
        title: subject,
        body_text: body,
        meta,
        visibility: 'restricted',
        visible_to: [me],
        processing_state: 'done',
      })
      .returning({ id: entries.id });
    return { result: { id: e!.id }, inverse: [{ op: 'delete', table: 'entries', id: e!.id }] };
  },
});

export const mailDraftDelete = defineAction({
  type: 'mail.draft_delete',
  schema: z.object({ id: z.uuid() }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { id }) {
    const d = await loadDraft(tx, id);
    if (EntwurfMeta.parse(d.meta).send?.status === 'queued') throw new ActionError('mail is being sent');
    return { result: { id }, inverse: [await deleteWithInverse(tx, entries, 'entries', id)] };
  },
});

export const mailSend = defineAction({
  type: 'mail.send',
  schema: z.object({ id: z.uuid() }),
  external: true,
  allowedActors: ['user'],
  async apply(tx, { id }, ctx) {
    const me = userOf(ctx);
    const d = await loadDraft(tx, id);
    const meta = EntwurfMeta.parse(d.meta);
    await assertMailbox(tx, meta.connection_id, me);
    if (meta.send?.status === 'queued') throw new ActionError('mail is being sent');
    if (!meta.to.length && !meta.cc.length && !meta.bcc.length) throw new ActionError('no recipient');
    const [c] = await tx.select({ config: connections.config }).from(connections).where(eq(connections.id, meta.connection_id));
    const domain = ((c!.config as { address?: string }).address ?? 'kollege.invalid').split('@')[1];
    const sendAfter = new Date(Date.now() + ZURUECKHOLBAR_S * 1000).toISOString();
    const message_id = `<${randomUUID()}@${domain}>`;
    const next = { ...meta, send: { status: 'queued' as const, message_id, send_after: sendAfter } };
    // undoable until the job sends it: the job clears this inverse (E43)
    return { result: { id, message_id, send_after: sendAfter }, inverse: [await updateWithInverse(tx, entries, 'entries', id, { meta: next })] };
  },
});

/** the actor's copies of mails (a thread): in their own or the team mailbox */
async function ownCopies(tx: Tx, entryIds: string[], userId: string) {
  const rows = await tx
    .select({ copy: mailCopies })
    .from(mailCopies)
    .innerJoin(connections, eq(connections.id, mailCopies.connection_id))
    .where(and(inArray(mailCopies.entry_id, entryIds), or(eq(connections.user_id, userId), isNull(connections.user_id))));
  if (!rows.length) throw new ActionError('no copy of this mail in your mailbox');
  return rows.map((r) => r.copy);
}

export const mailMarkRead = defineAction({
  type: 'mail.mark_read',
  // a whole thread at once: one action, one undo
  schema: z.object({ entry_ids: z.array(z.uuid()).min(1), seen: z.boolean().default(true) }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { entry_ids, seen }, ctx) {
    const copies = (await ownCopies(tx, entry_ids, userOf(ctx))).filter((c) => c.seen !== seen);
    const inverse: InverseOp[] = [];
    for (const c of copies) {
      await updateWithInverse(tx, mailCopies, 'mail_copies', c.id, { seen, pending: true });
      // undo must reach the mailbox as well: back to the old state, again pending
      inverse.push({ op: 'update', table: 'mail_copies', id: c.id, set: { seen: c.seen, pending: true } });
    }
    return { result: { changed: copies.length }, inverse };
  },
});

export const mailArchive = defineAction({
  type: 'mail.archive',
  schema: z.object({ entry_ids: z.array(z.uuid()).min(1) }),
  external: false,
  allowedActors: ['user', 'model'],
  async apply(tx, { entry_ids }, ctx) {
    // archiving takes the mails out of the inbox; copies in other folders stay where they are
    const copies = (await ownCopies(tx, entry_ids, userOf(ctx))).filter((c) => c.folder.toUpperCase() === 'INBOX' && !c.target_folder);
    if (!copies.length) throw new ActionError('not in your inbox');
    const inverse: InverseOp[] = [];
    for (const c of copies) {
      await updateWithInverse(tx, mailCopies, 'mail_copies', c.id, { target_folder: '\\Archive', pending: true });
      inverse.push({ op: 'update', table: 'mail_copies', id: c.id, set: { target_folder: '\\Inbox', pending: true } });
    }
    return { result: { changed: copies.length }, inverse };
  },
});
