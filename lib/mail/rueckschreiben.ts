// Write back what Kollege changed (read state, archive) to the mailboxes – before each sync
// of the connection. The mailbox follows the database; results are recorded like the intake.
import { and, eq } from 'drizzle-orm';
import { zurueckschreiben } from '@/lib/connectors/imap';
import { withSystem } from '@/lib/db/client';
import { connections, mailCopies } from '@/lib/db/schema';

export async function rueckschreiben(connectionId: string): Promise<{ ok: number; fehler: string[] }> {
  const [conn] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connectionId)));
  if (!conn || conn.provider !== 'imap' || conn.status === 'disabled') return { ok: 0, fehler: [] };
  // uid 0: moved without UIDPLUS, the next sync of the target folder fills it in first
  const offen = (await withSystem((tx) =>
    tx.select().from(mailCopies).where(and(eq(mailCopies.connection_id, connectionId), eq(mailCopies.pending, true))),
  )).filter((k) => k.uid > 0);
  const ergebnisse = await zurueckschreiben(conn, offen);
  const fehler: string[] = [];
  for (const r of ergebnisse) {
    if (r.ok) {
      await withSystem((tx) =>
        tx.update(mailCopies)
          .set({ folder: r.folder, uid: r.uid, uid_validity: r.uidValidity, target_folder: null, pending: false })
          .where(eq(mailCopies.id, r.id)),
      );
    } else {
      fehler.push(r.error);
      // the UID no longer points to this mail: give up instead of retrying forever
      if (r.error.includes('UIDVALIDITY')) {
        await withSystem((tx) => tx.update(mailCopies).set({ pending: false, target_folder: null }).where(eq(mailCopies.id, r.id)));
      }
    }
  }
  return { ok: ergebnisse.length - fehler.length, fehler };
}
