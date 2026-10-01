// Common connector interface – BAUVORLAGE §12.
import type { connections } from '@/lib/db/schema';

export type Connection = typeof connections.$inferSelect;

export interface Address {
  name?: string;
  email: string;
}

export interface RawAttachment {
  filename: string;
  mime: string;
  /** original bytes (fixtures: the extracted text stands in for the file) */
  content: string;
  /** extracted text, null = metadata only */
  text: string | null;
}

export interface RawItem {
  kind: 'mail' | 'event' | 'file';
  externalId: string;
  /** Mail: Message-ID; event: iCalUID; file: path + content hash */
  dedupeKey: string;
  occurredAt: Date;
  title: string | null;
  bodyText: string | null;
  /** mail threading */
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  /** Mail: from/to/cc/headers/folder; event: start/end/location/organizer/attendees; file: path/mime */
  meta: Record<string, unknown>;
  /** original content, stored as blob */
  raw: string;
  attachments: RawAttachment[];
}

/** An element the connector could not read. Never blocks the sync (§12). */
export interface SyncError {
  ref: string;
  message: string;
}

export interface SyncResult {
  items: RawItem[];
  errors: SyncError[];
  cursor: unknown;
}

export interface Connector {
  sync(connection: Connection, cursor: unknown): Promise<SyncResult>;
}
