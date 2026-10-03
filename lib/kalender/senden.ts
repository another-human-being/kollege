// "Einladung senden" / "Änderung senden" / cancellation (E10, E28, E48) – the send job, 10 s after
// the click, like mail (E43): under the lock of the action row; recalled → nothing happens.
// Order: first the calendar (if that fails, nothing went out), then the invitation mail over the
// person's own mailbox. Then the inverse goes: from now on it is out.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { TerminMeta } from '@/lib/actions/event';
import { CaldavConfig, caldavClient } from '@/lib/connectors/caldav';
import { einladung } from '@/lib/connectors/ical';
import { ImapConfig } from '@/lib/connectors/imap';
import { baueMail, sendeMail } from '@/lib/connectors/smtp';
import { withSystem } from '@/lib/db/client';
import { actions, connections, entries, eventCopies, users } from '@/lib/db/schema';
import { putBlob } from '@/lib/pipeline/blobs';
import { objektFuer, terminDaten } from './schreiben';

export type TerminErgebnis = 'gesendet' | 'zurueckgeholt' | 'nicht_wartend' | 'fehler';

export async function sendeTermin(actionId: string): Promise<{ ergebnis: TerminErgebnis; fehler?: string }> {
  return withSystem(async (tx) => {
    const [a] = await tx.select().from(actions).where(eq(actions.id, actionId)).for('update');
    if (!a || (a.type !== 'event.send' && a.type !== 'event.cancel')) return { ergebnis: 'nicht_wartend' as const };
    if (a.undone_at) return { ergebnis: 'zurueckgeholt' as const };
    const id = (a.payload as { id: string }).id;
    const [e] = await tx.select().from(entries).where(eq(entries.id, id)).for('update');
    if (!e) return { ergebnis: 'nicht_wartend' as const };
    const m = TerminMeta.parse(e.meta);
    if (m.versand !== 'sendet' || !m.send) return { ergebnis: 'nicht_wartend' as const };
    const absage = m.send.art === 'absage';
    const [copy] = await tx.select().from(eventCopies).where(eq(eventCopies.entry_id, id));
    const [kal] = copy ? await tx.select().from(connections).where(eq(connections.id, copy.connection_id)) : [];
    const [author] = await tx.select().from(users).where(eq(users.id, e.author_user_id ?? a.actor_user_id!));
    const [post] = await tx.select().from(connections)
      .where(and(eq(connections.kind, 'mail'), eq(connections.provider, 'imap'), eq(connections.user_id, author!.id)));
    const zurueck = async (fehler: string) => {
      // not out: back to what it was, with the reason; the undo still works
      await tx.update(entries).set({ meta: { ...m, versand: absage ? 'gesendet' : (copy?.etag ? 'aenderung_offen' : 'entwurf'), send: { ...m.send!, error: fehler.slice(0, 300) } } }).where(eq(entries.id, id));
      return { ergebnis: 'fehler' as const, fehler };
    };
    if (!copy || !kal) return zurueck('kein Kalender');
    if (!post) return zurueck('Für Einladungen fehlt ein Postfach mit Versand (SMTP).');
    const cal = CaldavConfig.parse(kal.config);
    const mail = ImapConfig.parse(post.config);
    const organizer = { email: cal.address, name: author!.name };

    // whoever is in the list is invited now; answers given so far stay
    const teilnahme = m.teilnahme.map((t) => (t.status === 'nicht_eingeladen' ? { ...t, status: 'offen' as const } : t));
    const next: TerminMeta = { ...m, teilnahme, attendees: teilnahme.map((t) => t.email), versand: 'gesendet', send: undefined, ...(absage ? { status: 'CANCELLED' } : {}) };
    const ics = await objektFuer(e, await terminDaten(e, next, organizer));
    const client = await caldavClient(cal);
    try {
      const r = absage
        ? copy.etag ? await client.deleteCalendarObject({ calendarObject: { url: copy.href, etag: copy.etag } }) : new Response(null, { status: 204 })
        : copy.etag
          ? await client.updateCalendarObject({ calendarObject: { url: copy.href, etag: copy.etag, data: ics } })
          : await client.createCalendarObject({ calendar: { url: copy.calendar_url }, filename: copy.href.slice(copy.calendar_url.length), iCalString: ics });
      if (r.status === 412) return zurueck('Der Termin wurde gleichzeitig woanders geändert. Bitte neu laden und noch einmal senden.');
      if (!r.ok && !(absage && r.status === 404)) return zurueck(`Kalender: HTTP ${r.status}`);
      const etag = absage ? null : r.headers.get('etag');
      // the calendar is changed – from here on it counts as out, even if the mail fails
      const an = teilnahme.map((t) => t.email).filter((x) => x !== cal.address);
      try {
        const out = {
          from: { name: author!.name, address: mail.address ?? author!.email }, to: an, cc: [], bcc: [],
          subject: `${absage ? 'Abgesagt: ' : m.versand === 'sendet' && copy.etag ? 'Geändert: ' : 'Einladung: '}${e.title ?? ''}`,
          text: absage ? `Der Termin „${e.title}“ ist abgesagt.` : `Einladung zu „${e.title}“.`,
          messageId: `<${randomUUID()}@${(mail.address ?? 'kollege.invalid').split('@')[1]}>`,
          attachments: [], date: new Date(),
          icalEvent: { method: absage ? 'CANCEL' as const : 'REQUEST' as const, content: einladung(ics, absage ? 'CANCEL' : 'REQUEST'), filename: 'einladung.ics' },
        };
        if (an.length) await sendeMail(mail, out, await baueMail(out));
      } catch (err) {
        next.versand = 'aenderung_offen';
        next.send = { art: absage ? 'absage' : 'einladung', send_after: new Date().toISOString(), error: `Kalender geändert, aber die Einladungsmail ging nicht raus: ${err instanceof Error ? err.message : String(err)}` };
      }
      await tx.update(entries).set({ meta: next, blob_path: absage ? e.blob_path : await putBlob(ics) }).where(eq(entries.id, id));
      if (absage) await tx.delete(eventCopies).where(eq(eventCopies.id, copy.id));
      else await tx.update(eventCopies).set({ etag, pending: false }).where(eq(eventCopies.id, copy.id));
      await tx.update(actions).set({ inverse: null }).where(eq(actions.id, actionId));
      return next.send?.error ? { ergebnis: 'fehler' as const, fehler: next.send.error } : { ergebnis: 'gesendet' as const };
    } catch (err) {
      return zurueck(err instanceof Error ? err.message : String(err));
    }
  });
}
