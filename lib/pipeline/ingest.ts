// Step 1 of the intake (§7.1): sync a connection and store every item raw.
// Raw storage, visibility of known mails, cursor and processing state are
// infrastructure writes outside runAction (decision 2026-10-01, STAND.md):
// they record what arrived, they do not decide anything.
import { eq, inArray, sql } from 'drizzle-orm';
import { fixtureConnector } from '@/lib/connectors/fixture';
import { caldavConnector } from '@/lib/connectors/caldav';
import { laufwerkConnector } from '@/lib/connectors/laufwerk';
import { imapConnector } from '@/lib/connectors/imap';
import type { Connection, Connector, RawItem, SyncError } from '@/lib/connectors/types';
import { withSystem, type Tx } from '@/lib/db/client';
import { connections, entries, eventCopies, mailCopies, users } from '@/lib/db/schema';
import { putBlob } from './blobs';

const connectors: Partial<Record<Connection['provider'], Connector>> = { fixture: fixtureConnector, imap: imapConnector, caldav: caldavConnector, smb: laufwerkConnector };

export interface SyncSummary {
  /** entries stored for the first time – each needs process:<entry> */
  newEntryIds: string[];
  /** already known entries (e.g. same mail from another mailbox) */
  knownEntryIds: string[];
  errors: SyncError[];
  /** first sync of the connection = import (§7.3) */
  isImport: boolean;
}

export async function syncConnection(connectionId: string, opts: { now?: Date } = {}): Promise<SyncSummary> {
  const now = opts.now ?? new Date();
  const [conn] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connectionId)));
  if (!conn) throw new Error(`connection ${connectionId} not found`);
  if (conn.status === 'disabled') return { newEntryIds: [], knownEntryIds: [], errors: [], isImport: false };
  const connector = connectors[conn.provider];
  if (!connector) throw new Error(`no connector for provider ${conn.provider} yet`);

  const isImport = conn.cursor === null;
  const summary: SyncSummary = { newEntryIds: [], knownEntryIds: [], errors: [], isImport };
  let cursor = conn.cursor;
  // a large import arrives in batches; the cursor is saved after each one (§12: idempotent)
  for (;;) {
    let result;
    try {
      result = await connector.sync(conn, cursor);
    } catch (e) {
      await withSystem((tx) =>
        tx.update(connections).set({ status: 'error', last_error: String(e) }).where(eq(connections.id, conn.id)),
      );
      throw e;
    }
    const errors = [...result.errors];
    for (const item of result.items) {
      try {
        const { id, inserted } = await withSystem((tx) => storeItem(tx, conn, item, isImport && item.occurredAt < now));
        (inserted ? summary.newEntryIds : summary.knownEntryIds).push(id);
      } catch (e) {
        errors.push({ ref: item.externalId, message: String(e) });
      }
    }
    for (const err of errors) await withSystem((tx) => storeError(tx, conn, err, now));
    for (const ref of result.removed ?? []) {
      await withSystem((tx) => (conn.kind === 'drive' ? removeFile(tx, conn, ref) : removeCopy(tx, conn, ref)));
    }
    summary.errors.push(...errors);
    cursor = result.cursor;
    await withSystem((tx) =>
      tx
        .update(connections)
        .set({
          cursor,
          last_sync_at: now,
          status: 'ok',
          last_error: summary.errors.length ? `${summary.errors.length} Elemente nicht lesbar` : null,
        })
        .where(eq(connections.id, conn.id)),
    );
    if (!result.more) break;
  }
  return summary;
}

function visibilityOf(conn: Connection) {
  // a team source (StartHub mailbox, shared drive) is visible to all (§5)
  return conn.user_id === null
    ? { visibility: 'team' as const, visible_to: [] as string[] }
    : { visibility: 'restricted' as const, visible_to: [conn.user_id] as string[] };
}

interface KalenderOrt {
  calendar_url: string;
  href: string;
  etag: string;
}

interface Ort {
  folder: string;
  uid: number;
  uidValidity: string;
  seen: boolean;
}

async function storeItem(tx: Tx, conn: Connection, item: RawItem, historical: boolean) {
  const blob = await putBlob(item.raw);
  const vis = visibilityOf(conn);
  if (item.kind === 'event' && vis.visibility === 'restricted') {
    // invited team members see the event too (decision 2026-10-01)
    const invited = [item.meta.organizer as string | null, ...((item.meta.attendees as string[]) ?? [])].filter((x): x is string => !!x);
    const team = await tx.select({ id: users.id }).from(users).where(inArray(users.email, invited));
    vis.visible_to = [...new Set([...vis.visible_to, ...team.map((u) => u.id)])].sort();
  }

  const attachments = [];
  for (const a of item.attachments) {
    attachments.push({ filename: a.filename, mime: a.mime, text: a.text, blob_path: await putBlob(a.content) });
  }

  // where this copy lies (mail via IMAP, events via CalDAV): stored in *_copies, not in meta
  const { ort, kalender_ort: kOrt, ...meta } = item.meta as { ort?: Ort; kalender_ort?: KalenderOrt } & Record<string, unknown>;

  const authorEmail =
    item.kind === 'mail' ? (item.meta.from as { email: string }).email
    : item.kind === 'event' ? (item.meta.organizer as string)
    : (item.meta.modified_by as string | null);
  const [author] = authorEmail
    ? await tx.select({ id: users.id }).from(users).where(eq(users.email, authorEmail))
    : [];

  const [row] = await tx
    .insert(entries)
    .values({
      kind: item.kind,
      connection_id: conn.id,
      external_id: item.externalId,
      dedupe_key: item.dedupeKey,
      thread_key: item.kind === 'mail' ? await threadKey(tx, item) : null,
      occurred_at: item.occurredAt,
      author_user_id: author?.id,
      title: item.title,
      body_text: item.bodyText,
      blob_path: blob,
      meta: attachments.length ? { ...meta, attachments } : meta,
      ...vis,
      historical,
      processing_state: 'pending',
    })
    .onConflictDoUpdate({
      // known item from a further mailbox: only widen who may see it (§7.1)
      target: entries.dedupe_key,
      set: {
        visibility: sql`CASE WHEN ${entries.visibility} = 'team' OR excluded.visibility = 'team'
                        THEN 'team'::entry_visibility ELSE 'restricted'::entry_visibility END`,
        visible_to: sql`ARRAY(SELECT DISTINCT unnest(${entries.visible_to} || excluded.visible_to) ORDER BY 1)`,
      },
    })
    .returning({ id: entries.id, inserted: sql<boolean>`(xmax = 0)`, visibility: entries.visibility, visible_to: entries.visible_to });

  if (ort) {
    await tx
      .insert(mailCopies)
      .values({ entry_id: row!.id, connection_id: conn.id, folder: ort.folder, uid: ort.uid, uid_validity: ort.uidValidity, seen: ort.seen })
      .onConflictDoUpdate({
        target: [mailCopies.entry_id, mailCopies.connection_id, mailCopies.folder],
        // the mailbox is the truth for place and read state – unless Kollege still has to write back
        set: {
          uid: ort.uid,
          uid_validity: ort.uidValidity,
          seen: sql`CASE WHEN ${mailCopies.pending} THEN ${mailCopies.seen} ELSE excluded.seen END`,
          updated_at: sql`now()`,
        },
      });
  }

  if (kOrt) {
    // a local change not yet written wins until the worker has written it (then the server's state comes back)
    const [lokal] = await tx.select({ id: eventCopies.id }).from(eventCopies)
      .where(sql`${eventCopies.entry_id} = ${row!.id} AND ${eventCopies.pending}`);
    await tx
      .insert(eventCopies)
      .values({ entry_id: row!.id, connection_id: conn.id, calendar_url: kOrt.calendar_url, href: kOrt.href, etag: kOrt.etag })
      .onConflictDoUpdate({
        target: [eventCopies.entry_id, eventCopies.connection_id],
        set: lokal ? { updated_at: sql`now()` } : { calendar_url: kOrt.calendar_url, href: kOrt.href, etag: kOrt.etag, updated_at: sql`now()` },
      });
    // events change at the source (time, place, attendees) – mails never do
    if (!row!.inserted && !lokal) {
      await tx
        .update(entries)
        .set({ title: item.title, body_text: item.bodyText, occurred_at: item.occurredAt, blob_path: blob, meta: sql`${entries.meta} || ${JSON.stringify(meta)}::jsonb` })
        .where(eq(entries.id, row!.id));
    }
  }

  if (item.kind === 'file' && !row!.inserted) {
    // a version that comes back (restored, or an older content again) is the current one again
    await tx.update(entries).set({ occurred_at: item.occurredAt, meta: sql`${entries.meta} - 'geloescht'` }).where(eq(entries.id, row!.id));
  }

  if (!row!.inserted) {
    // attachment entries share the visibility of their mail
    await tx
      .update(entries)
      .set({ visibility: row!.visibility, visible_to: row!.visible_to })
      .where(sql`${entries.meta}->>'mail_entry_id' = ${row!.id}`);
  }
  return { id: row!.id, inserted: row!.inserted };
}

/** References[0] is the thread root; otherwise inherit from the replied-to mail. */
async function threadKey(tx: Tx, item: RawItem): Promise<string> {
  if (item.references?.length) return item.references[0]!;
  if (item.inReplyTo) {
    const [parent] = await tx
      .select({ thread_key: entries.thread_key })
      .from(entries)
      .where(eq(entries.dedupe_key, item.inReplyTo));
    return parent?.thread_key ?? item.inReplyTo;
  }
  return item.messageId!;
}

/** A broken element is logged as an entry and never blocks the sync (§12). */
async function storeError(tx: Tx, conn: Connection, err: SyncError, now: Date) {
  await tx
    .insert(entries)
    .values({
      kind: 'system',
      connection_id: conn.id,
      dedupe_key: `sync-error:${conn.id}:${err.ref}`,
      occurred_at: now,
      title: `Element ${err.ref} aus „${conn.label}“ nicht lesbar`,
      body_text: err.message,
      ...visibilityOf(conn),
      processing_state: 'skipped',
    })
    .onConflictDoNothing();
}

/** deleted at the source: the copy goes; without any copy left the event counts as cancelled */
async function removeCopy(tx: Tx, conn: Connection, href: string) {
  const gone = await tx.delete(eventCopies)
    .where(sql`${eventCopies.connection_id} = ${conn.id} AND ${eventCopies.href} = ${href} AND NOT ${eventCopies.pending}`)
    .returning({ entry_id: eventCopies.entry_id });
  for (const g of gone) {
    const [rest] = await tx.select({ id: eventCopies.id }).from(eventCopies).where(eq(eventCopies.entry_id, g.entry_id));
    if (!rest) await tx.update(entries).set({ meta: sql`${entries.meta} || '{"status": "CANCELLED", "an_quelle_geloescht": true}'::jsonb` }).where(eq(entries.id, g.entry_id));
  }
}

/** a file gone from the drive: its versions stay (Verlauf, links), marked as deleted */
async function removeFile(tx: Tx, conn: Connection, path: string) {
  await tx.update(entries).set({ meta: sql`${entries.meta} || '{"geloescht": true}'::jsonb` })
    .where(sql`${entries.connection_id} = ${conn.id} AND ${entries.kind} = 'file' AND ${entries.external_id} = ${path}`);
}
