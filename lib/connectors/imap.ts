// Mail via IMAP (§12, decision 25): imapflow + mailparser. Reads, never changes the
// mailbox (stage 5 writes back). Robust by rule: every message on its own (a broken one
// becomes a SyncError, the cursor moves on), Message-ID required, dates with time zone.
//
// config  { host, port, secure, user, password: enc:v1:…, folders?: string[] }
// cursor  { folders: { [path]: { uidValidity, lastUid, importing } } }
// First sync of a folder = import from connections.import_since (in batches, the date limit
// stays until the folder is through); afterwards only UIDs above uidNext of that moment.
// A changed UIDVALIDITY re-reads the folder from import_since (dedupe by Message-ID).
import { ImapFlow, type ListResponse } from 'imapflow';
import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser';
import { z } from 'zod';
import { decrypt } from '@/lib/crypto';
import { extractText } from '@/lib/pipeline/extract';
import type { Address, Connection, Connector, RawAttachment, RawItem, SyncError, SyncResult } from './types';

export const ImapConfig = z.object({
  host: z.string().min(1),
  port: z.number().int().default(993),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  /** encrypted with APP_SECRET (lib/crypto.ts) */
  password: z.string().startsWith('enc:v1:'),
  /** default: all folders except junk, trash and drafts */
  folders: z.array(z.string()).optional(),
  /** sender address of this mailbox (stage 5) */
  address: z.email().optional(),
  /** outgoing mail (stage 5); same login as IMAP */
  smtp: z.object({ host: z.string().min(1), port: z.number().int().default(465), secure: z.boolean().default(true) }).optional(),
});
export type ImapConfig = z.infer<typeof ImapConfig>;

const Cursor = z.object({
  folders: z.record(z.string(), z.object({
    uidValidity: z.string(),
    lastUid: z.number().int(),
    /** import of this folder not finished: keep the date limit (older mail can carry higher UIDs) */
    importing: z.boolean().default(false),
  })),
});
type Cursor = z.infer<typeof Cursor>;

/** messages per sync call; the intake calls again while `more` (large imports stay in memory bounds) */
export const BATCH = 100;
const SKIP_USE = new Set(['\\Junk', '\\Trash', '\\Drafts']);
const KEEP_HEADERS = ['list-unsubscribe', 'list-id', 'precedence', 'auto-submitted', 'x-auto-response-suppress'];

export function imapClient(cfg: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: decrypt(cfg.password) },
    logger: false, // never log: credentials and mail content
    connectionTimeout: 30_000,
  });
}

export function foldersToRead(list: ListResponse[], configured?: string[]): ListResponse[] {
  if (configured?.length) return list.filter((f) => configured.includes(f.path));
  return list.filter((f) => !f.flags.has('\\Noselect') && !(f.specialUse && SKIP_USE.has(f.specialUse)));
}

const addresses = (a: AddressObject | AddressObject[] | undefined): Address[] =>
  (Array.isArray(a) ? a : a ? [a] : [])
    .flatMap((o) => o.value)
    .filter((v) => v.address)
    .map((v) => ({ ...(v.name ? { name: v.name } : {}), email: v.address!.toLowerCase() }));

const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(/\s+/).filter(Boolean) : []);

/** one message → RawItem; throws for what must not enter (no Message-ID, no sender) */
export async function toRawItem(source: Buffer, ctx: { folder: string; uid: number; uidValidity: string; internalDate?: Date; seen: boolean }): Promise<RawItem> {
  const m: ParsedMail = await simpleParser(source, { skipImageLinks: true });
  if (!m.messageId) throw new Error('Mail ohne Message-ID');
  const from = addresses(m.from)[0];
  if (!from) throw new Error('Mail ohne Absender');
  // raw header lines: mailparser folds List-* into one structured "list" key
  const headers: Record<string, string> = {};
  for (const h of m.headerLines) {
    if (KEEP_HEADERS.includes(h.key)) headers[h.key] = h.line.slice(h.line.indexOf(':') + 1).replace(/\s+/g, ' ').trim();
  }
  const attachments: RawAttachment[] = [];
  for (const a of m.attachments) {
    // inline images (signatures, logos) are not attachments anyone filed
    if (a.contentDisposition === 'inline' && a.contentType.startsWith('image/')) continue;
    const filename = a.filename ?? 'Anhang';
    attachments.push({ filename, mime: a.contentType, content: a.content, text: await extractText(filename, a.contentType, a.content) });
  }
  const date = m.date && !Number.isNaN(m.date.getTime()) ? m.date : ctx.internalDate;
  if (!date) throw new Error('Mail ohne gültiges Datum');
  return {
    kind: 'mail',
    externalId: `${ctx.folder}:${ctx.uidValidity}:${ctx.uid}`,
    dedupeKey: m.messageId,
    occurredAt: date,
    title: m.subject ?? null,
    bodyText: (m.text ?? '').trim() || null,
    messageId: m.messageId,
    inReplyTo: m.inReplyTo,
    references: asList(m.references),
    meta: {
      from, to: addresses(m.to), cc: addresses(m.cc), headers, folder: ctx.folder,
      // where this copy lies – the intake keeps one per mailbox and folder (stage 5 writes back there)
      ort: { folder: ctx.folder, uid: ctx.uid, uidValidity: ctx.uidValidity, seen: ctx.seen },
    },
    raw: source,
    attachments,
  };
}

export function makeImapConnector(batch = BATCH): Connector {
  return { sync: (conn, cursor) => syncImap(conn, cursor, batch) };
}
export const imapConnector = makeImapConnector();

async function syncImap(conn: Connection, rawCursor: unknown, batch: number): Promise<SyncResult> {
  const cfg = ImapConfig.parse(conn.config);
  const cursor: Cursor = rawCursor ? Cursor.parse(rawCursor) : { folders: {} };
  const since = conn.import_since ? new Date(`${conn.import_since}T00:00:00Z`) : new Date(Date.now() - 365 * 86_400_000);
  const items: RawItem[] = [];
  const errors: SyncError[] = [];
  let more = false;

  const client = imapClient(cfg);
  await client.connect();
  try {
    for (const folder of foldersToRead(await client.list(), cfg.folders)) {
      if (items.length >= batch) { more = true; break; }
      const lock = await client.getMailboxLock(folder.path, { readOnly: true });
      try {
        const box = client.mailbox;
        if (!box) continue;
        const uidValidity = String(box.uidValidity);
        const known = cursor.folders[folder.path];
        const fresh = !known || known.uidValidity !== uidValidity;
        const lastUid = fresh ? 0 : known.lastUid;
        const importing = fresh || known.importing;
        // SENTSINCE = date of the mail; SINCE would be the date it was filed in the mailbox
        const query = importing ? { sentSince: since, uid: `${lastUid + 1}:*` } : { uid: `${lastUid + 1}:*` };
        const uids = ((await client.search(query, { uid: true })) || []).filter((u) => u > lastUid).sort((a, b) => a - b);
        const take = uids.slice(0, batch - items.length);
        const rest = take.length < uids.length;
        if (rest) more = true;
        if (take.length) {
          for await (const msg of client.fetch(take, { uid: true, source: true, internalDate: true, flags: true }, { uid: true })) {
            const ref = `${folder.path}:${msg.uid}`;
            try {
              if (!msg.source) throw new Error('Quelle fehlt');
              const internalDate = msg.internalDate ? new Date(msg.internalDate) : undefined;
              const item = await toRawItem(msg.source, { folder: folder.path, uid: msg.uid, uidValidity, internalDate, seen: msg.flags?.has('\\Seen') ?? false });
              // servers differ for mails without a Date header: the import limit is checked here as well
              if (!importing || item.occurredAt >= since) items.push(item);
            } catch (e) {
              errors.push({ ref, message: e instanceof Error ? e.message : String(e) });
            }
          }
        }
        cursor.folders[folder.path] = rest
          ? { uidValidity, lastUid: take.at(-1)!, importing }
          // folder is through: everything that exists now counts as read
          : { uidValidity, lastUid: Math.max(take.at(-1) ?? lastUid, importing ? Number(box.uidNext) - 1 : 0), importing: false };
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
  return { items, errors, cursor, more };
}

// --- writing back (stage 5): read state, moves, the sent copy ----------------------------

export interface Kopie {
  id: string;
  folder: string;
  uid: number;
  uid_validity: string;
  seen: boolean;
  /** '\\Archive', '\\Inbox' or a folder path */
  target_folder: string | null;
}

export type Zurueckgeschrieben = { id: string; ok: true; folder: string; uid: number; uidValidity: string } | { id: string; ok: false; error: string };

async function specialFolder(client: ImapFlow, use: '\\Archive' | '\\Sent' | '\\Inbox'): Promise<string> {
  if (use === '\\Inbox') return 'INBOX';
  const list = await client.list();
  const found = list.find((f) => f.specialUse === use);
  if (found) return found.path;
  const name = use === '\\Archive' ? 'Archive' : 'Sent';
  if (!list.some((f) => f.path === name)) await client.mailboxCreate(name);
  return name;
}

/** apply Kollege's changes to the mailbox; each copy on its own (one failure does not stop the rest) */
export async function zurueckschreiben(conn: Connection, kopien: Kopie[]): Promise<Zurueckgeschrieben[]> {
  if (!kopien.length) return [];
  const client = imapClient(ImapConfig.parse(conn.config));
  await client.connect();
  const out: Zurueckgeschrieben[] = [];
  try {
    for (const k of kopien) {
      const lock = await client.getMailboxLock(k.folder);
      try {
        // a changed UIDVALIDITY means the UID points elsewhere now: do not touch anything
        if (String(client.mailbox && client.mailbox.uidValidity) !== k.uid_validity) throw new Error('UIDVALIDITY geändert');
        if (k.seen) await client.messageFlagsAdd(String(k.uid), ['\\Seen'], { uid: true });
        else await client.messageFlagsRemove(String(k.uid), ['\\Seen'], { uid: true });
        let place = { folder: k.folder, uid: k.uid, uidValidity: k.uid_validity };
        const target = k.target_folder?.startsWith('\\') ? await specialFolder(client, k.target_folder as '\\Archive' | '\\Inbox') : k.target_folder;
        if (target && target !== k.folder) {
          const moved = await client.messageMove(String(k.uid), target, { uid: true });
          if (!moved) throw new Error('Verschieben fehlgeschlagen');
          // without UIDPLUS the new UID is unknown (0): the next sync of the target folder fills it in
          const uid = moved.uidMap?.get(k.uid) ?? 0;
          place = { folder: target, uid, uidValidity: moved.uidValidity !== undefined ? String(moved.uidValidity) : '' };
        }
        out.push({ id: k.id, ok: true, ...place });
      } catch (e) {
        out.push({ id: k.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
  return out;
}

/** the sent mail into the sent folder (SMTP does not do that); returns where it lies */
export async function inGesendetAblegen(conn: Connection, raw: Buffer): Promise<{ folder: string; uid?: number; uidValidity?: string }> {
  const client = imapClient(ImapConfig.parse(conn.config));
  await client.connect();
  try {
    const folder = await specialFolder(client, '\\Sent');
    const r = await client.append(folder, raw, ['\\Seen']);
    return { folder, uid: r ? r.uid : undefined, uidValidity: r && r.uidValidity !== undefined ? String(r.uidValidity) : undefined };
  } finally {
    await client.logout().catch(() => client.close());
  }
}
