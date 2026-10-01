// Fixture connector (stage 1): reads fixtures/{mail,calendar,drive}.json.
// Every item carries meta.fixture_key so the oracle can answer for the model.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { fixturesDir, teamConfig } from '@/lib/config';
import type { Connection, Connector, RawItem, SyncError } from './types';

const Config = z.object({
  source: z.enum(['mail', 'calendar', 'drive']),
  mailbox: z.string().optional(),
  calendar: z.string().optional(),
  /** other fixture directory (tests) */
  dir: z.string().optional(),
});

/** Cursor: keys already delivered – the fixture data never changes. */
const Cursor = z.object({ keys: z.array(z.string()) }).nullable();

const offsetDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const Address = z.object({ name: z.string().optional(), email: z.email().transform((e) => e.toLowerCase()) });

const Mail = z.object({
  key: z.string(),
  // a mail without Message-ID is rejected (§12)
  message_id: z.string().regex(/^<.+@.+>$/, 'Message-ID fehlt oder ist ungültig'),
  in_reply_to: z.string().optional(),
  references: z.array(z.string()).optional(),
  mailboxes: z.array(z.string()).min(1),
  folder: z.string().optional(),
  date: offsetDate,
  from: Address,
  to: z.array(Address),
  cc: z.array(Address).default([]),
  subject: z.string(),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string(),
  attachments: z.array(z.object({ filename: z.string(), mime: z.string(), text: z.string().nullable() })).default([]),
});

const Event = z.object({
  key: z.string(),
  uid: z.string().min(1),
  calendar: z.string(),
  title: z.string(),
  start: offsetDate,
  end: offsetDate,
  location: z.string().optional(),
  recurrence: z.string().optional(),
  organizer: z.email(),
  attendees: z.array(z.email()).default([]),
});

const File = z.object({
  key: z.string(),
  path: z.string().min(1),
  modified: offsetDate,
  modified_by: z.string().nullable(),
  mime: z.string(),
  text: z.string().nullable(),
});

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function toItem(source: 'mail' | 'calendar' | 'drive', el: unknown): RawItem {
  const raw = JSON.stringify(el);
  if (source === 'mail') {
    const m = Mail.parse(el);
    return {
      kind: 'mail',
      externalId: m.message_id,
      dedupeKey: m.message_id,
      occurredAt: m.date,
      title: m.subject,
      bodyText: m.body,
      messageId: m.message_id,
      inReplyTo: m.in_reply_to,
      references: m.references,
      meta: { fixture_key: m.key, from: m.from, to: m.to, cc: m.cc, headers: m.headers, folder: m.folder ?? 'Inbox' },
      raw,
      attachments: m.attachments.map((a) => ({ ...a, content: a.text ?? '' })),
    };
  }
  if (source === 'calendar') {
    const e = Event.parse(el);
    return {
      kind: 'event',
      externalId: e.uid,
      dedupeKey: e.uid,
      occurredAt: e.start,
      title: e.title,
      bodyText: null,
      meta: {
        fixture_key: e.key,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        location: e.location,
        recurrence: e.recurrence,
        organizer: e.organizer.toLowerCase(),
        attendees: e.attendees.map((a) => a.toLowerCase()),
      },
      raw,
      attachments: [],
    };
  }
  const f = File.parse(el);
  const modifiedBy = f.modified_by ? teamConfig().users.find((u) => u.key === f.modified_by)?.email : undefined;
  return {
    kind: 'file',
    externalId: f.path,
    dedupeKey: `${f.path}#${sha256(f.text ?? '')}`,
    occurredAt: f.modified,
    title: f.path.split('/').at(-1)!,
    bodyText: f.text,
    meta: { fixture_key: f.key, path: f.path, mime: f.mime, modified_by: modifiedBy ?? null },
    raw,
    attachments: [],
  };
}

const FILES = { mail: 'mail.json', calendar: 'calendar.json', drive: 'drive.json' } as const;

export const fixtureConnector: Connector = {
  async sync(connection: Connection, cursor: unknown) {
    const cfg = Config.parse(connection.config);
    const seen = new Set(Cursor.parse(cursor ?? null)?.keys ?? []);
    const elements = JSON.parse(readFileSync(`${cfg.dir ?? fixturesDir}/${FILES[cfg.source]}`, 'utf8')) as unknown[];
    const since = new Date(`${connection.import_since}T00:00:00`);

    const items: RawItem[] = [];
    const errors: SyncError[] = [];
    for (const [i, el] of elements.entries()) {
      // every element on its own: a broken one never blocks the others (§12)
      const ref = (el as { key?: unknown }).key;
      const key = typeof ref === 'string' ? ref : `#${i}`;
      if (seen.has(key)) continue;
      const owner = cfg.source === 'mail' ? cfg.mailbox : cfg.calendar;
      const holders = (el as { mailboxes?: unknown; calendar?: unknown });
      if (cfg.source === 'mail' && Array.isArray(holders.mailboxes) && !holders.mailboxes.includes(owner)) continue;
      if (cfg.source === 'calendar' && holders.calendar !== owner) continue;
      try {
        const item = toItem(cfg.source, el);
        if (item.occurredAt >= since) items.push(item);
      } catch (e) {
        errors.push({ ref: key, message: e instanceof z.ZodError ? z.prettifyError(e) : String(e) });
      }
      seen.add(key);
    }
    return { items, errors, cursor: { keys: [...seen] } };
  },
};
