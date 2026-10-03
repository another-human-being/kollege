// The calendar follows Kollege (decision 33): pending copies are written before each sync of the
// connection. Existing objects are changed in place (ical.ts); writes carry If-Match, so a change
// made meanwhile in Apple/Outlook/webmail is never overwritten – then the server wins and the next
// sync brings its state, with a note on the event. Results are recorded like the intake.
import { and, eq, sql } from 'drizzle-orm';
import { TerminMeta } from '@/lib/actions/event';
import { CaldavConfig, caldavClient } from '@/lib/connectors/caldav';
import { geaenderterTermin, neuerTermin, type TerminDaten } from '@/lib/connectors/ical';
import { withSystem } from '@/lib/db/client';
import { connections, entries, eventCopies, users } from '@/lib/db/schema';
import { getBlob, putBlob } from '@/lib/pipeline/blobs';

type Entry = typeof entries.$inferSelect;

export async function terminDaten(e: Entry, m: TerminMeta, organizer: { email: string; name?: string }): Promise<TerminDaten> {
  return {
    uid: e.dedupe_key, title: e.title ?? '', notes: e.body_text, location: m.location ?? null,
    start: m.start, end: m.end, allDay: m.all_day, organizer, attendees: m.teilnahme,
    status: m.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
  };
}

/** the object as it should be on the server: the original changed in place, or new */
export async function objektFuer(e: Entry, daten: TerminDaten): Promise<string> {
  if (e.blob_path) {
    try {
      return geaenderterTermin((await getBlob(e.blob_path)).toString('utf8'), daten);
    } catch { /* the original is unreadable: write it new */ }
  }
  return neuerTermin(daten);
}

export async function organizerVon(e: Entry, cfg: CaldavConfig) {
  const [u] = e.author_user_id ? await withSystem((tx) => tx.select().from(users).where(eq(users.id, e.author_user_id!))) : [];
  return { email: cfg.address, name: u?.name };
}

export async function kalenderSchreiben(connectionId: string): Promise<{ ok: number; fehler: string[] }> {
  const [conn] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connectionId)));
  if (!conn || conn.provider !== 'caldav' || conn.status === 'disabled') return { ok: 0, fehler: [] };
  const offen = await withSystem((tx) =>
    tx.select({ copy: eventCopies, e: entries }).from(eventCopies).innerJoin(entries, eq(entries.id, eventCopies.entry_id))
      .where(and(eq(eventCopies.connection_id, connectionId), eq(eventCopies.pending, true))));
  if (!offen.length) return { ok: 0, fehler: [] };
  const cfg = CaldavConfig.parse(conn.config);
  const client = await caldavClient(cfg);
  const fehler: string[] = [];
  let ok = 0;
  for (const { copy, e } of offen) {
    try {
      const m = TerminMeta.parse(e.meta);
      if (copy.loeschen) {
        if (copy.etag) {
          const r = await client.deleteCalendarObject({ calendarObject: { url: copy.href, etag: copy.etag } });
          if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
        }
        await withSystem((tx) => tx.delete(eventCopies).where(eq(eventCopies.id, copy.id)));
        ok++;
        continue;
      }
      // drafts with attendees wait for "Einladung senden" (E10) – never written by this path
      if (m.versand === 'entwurf' || m.versand === 'sendet') continue;
      const ics = await objektFuer(e, await terminDaten(e, m, await organizerVon(e, cfg)));
      const r = copy.etag
        ? await client.updateCalendarObject({ calendarObject: { url: copy.href, etag: copy.etag, data: ics } })
        : await client.createCalendarObject({ calendar: { url: copy.calendar_url }, filename: copy.href.slice(copy.calendar_url.length), iCalString: ics });
      if (r.status === 412) {
        // changed elsewhere meanwhile: the server wins, the next sync brings its state
        await withSystem(async (tx) => {
          await tx.update(eventCopies).set({ pending: false }).where(eq(eventCopies.id, copy.id));
          await tx.update(entries).set({ meta: sql`${entries.meta} || '{"konflikt": "Der Termin wurde gleichzeitig woanders geändert – deine Änderung ist nicht übernommen."}'::jsonb` }).where(eq(entries.id, e.id));
        });
        fehler.push(`412 ${copy.href}`);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await putBlob(ics);
      await withSystem(async (tx) => {
        await tx.update(eventCopies).set({ etag: r.headers.get('etag'), pending: false }).where(eq(eventCopies.id, copy.id));
        await tx.update(entries).set({ blob_path: blob, meta: sql`${entries.meta} - 'konflikt'` }).where(eq(entries.id, e.id));
      });
      ok++;
    } catch (err) {
      fehler.push(`${copy.href}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok, fehler };
}
