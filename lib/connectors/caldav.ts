// Calendar via CalDAV (§12, decision 33): iCloud (Apple Kalender), the Uni webmail if it offers
// CalDAV, any standard server. tsdav for the protocol, ical.js for the content.
//
// config  { url, user, password: enc:v1:…, calendars?: string[] (URLs; default all with events),
//           write_calendar?: URL (new events), address (organizer address of this person) }
// cursor  { calendars: { [url]: { ctag, etags: { [href]: etag } } } }
// A sync reads only calendars whose ctag changed, and in them only objects with a new etag;
// objects that disappeared are reported as removed.
import { createDAVClient, type DAVCalendar } from 'tsdav';
import { z } from 'zod';
import { decrypt } from '@/lib/crypto';
import { termineAus } from './ical';
import type { Connection, Connector, RawItem, SyncError, SyncResult } from './types';

export const CaldavConfig = z.object({
  url: z.url(),
  user: z.string().min(1),
  password: z.string().startsWith('enc:v1:'),
  calendars: z.array(z.string()).optional(),
  write_calendar: z.string().optional(),
  address: z.email(),
});
export type CaldavConfig = z.infer<typeof CaldavConfig>;

const Cursor = z.object({
  calendars: z.record(z.string(), z.object({ ctag: z.string().nullable(), etags: z.record(z.string(), z.string()) })),
});

/** how far ahead the calendar is read (the past: from import_since) */
const VORAUS_TAGE = 730;

export async function caldavClient(cfg: CaldavConfig) {
  return createDAVClient({
    serverUrl: cfg.url,
    credentials: { username: cfg.user, password: decrypt(cfg.password) },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
}

export async function kalenderListe(client: Awaited<ReturnType<typeof caldavClient>>, cfg: CaldavConfig): Promise<DAVCalendar[]> {
  const all = (await client.fetchCalendars()).filter((c) => !c.components || c.components.includes('VEVENT'));
  return cfg.calendars?.length ? all.filter((c) => cfg.calendars!.includes(c.url)) : all;
}

export const caldavConnector: Connector = {
  async sync(conn: Connection, rawCursor: unknown): Promise<SyncResult> {
    const cfg = CaldavConfig.parse(conn.config);
    const cursor = rawCursor ? Cursor.parse(rawCursor) : { calendars: {} as z.infer<typeof Cursor>['calendars'] };
    const client = await caldavClient(cfg);
    const items: RawItem[] = [];
    const errors: SyncError[] = [];
    const removed: string[] = [];
    const since = conn.import_since ? new Date(`${conn.import_since}T00:00:00Z`) : new Date(Date.now() - 365 * 86_400_000);
    const until = new Date(Date.now() + VORAUS_TAGE * 86_400_000);

    for (const cal of await kalenderListe(client, cfg)) {
      const known = cursor.calendars[cal.url];
      const ctag = (cal.ctag ?? null) as string | null;
      if (known && ctag && known.ctag === ctag) continue;
      const objects = await client.fetchCalendarObjects({ calendar: cal, timeRange: { start: since.toISOString(), end: until.toISOString() } });
      const etags: Record<string, string> = {};
      for (const o of objects) {
        const etag = o.etag ?? '';
        etags[o.url] = etag;
        if (known?.etags[o.url] === etag && etag) continue;
        try {
          const ics = String(o.data ?? '');
          for (const t of termineAus(ics)) {
            items.push({
              kind: 'event',
              externalId: o.url,
              dedupeKey: t.uid,
              occurredAt: new Date(t.start),
              title: t.title,
              bodyText: t.notes,
              meta: {
                start: t.start, end: t.end, all_day: t.allDay, location: t.location, recurrence: t.rrule, exdates: t.exdates,
                organizer: t.organizer, attendees: t.attendees.map((a) => a.email), teilnahme: t.attendees, status: t.status,
                sequence: t.sequence,
                // where this copy lies – stored in event_copies (writes go there with If-Match)
                kalender_ort: { calendar_url: cal.url, href: o.url, etag },
              },
              raw: ics,
              attachments: [],
            });
          }
        } catch (e) {
          errors.push({ ref: o.url, message: e instanceof Error ? e.message : String(e) });
        }
      }
      if (known) for (const href of Object.keys(known.etags)) if (!(href in etags)) removed.push(href);
      cursor.calendars[cal.url] = { ctag, etags };
    }
    return { items, errors, cursor, removed };
  },
};
