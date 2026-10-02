// Job definitions (pg-boss) – BAUVORLAGE §7.
//  import  first connection: sync + process bundled, own queue so it never holds up regular syncs
//  sync    per connection on a schedule; new entries → process
//  process one entry
import { ne } from 'drizzle-orm';
import type { PgBoss } from 'pg-boss';
import { withSystem } from '@/lib/db/client';
import { connections } from '@/lib/db/schema';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { rueckschreiben } from '@/lib/mail/rueckschreiben';
import { sendeEntwurf } from '@/lib/mail/senden';
import { processEntry } from '@/lib/pipeline/process';

type Connection = typeof connections.$inferSelect;

// §7.1: mail every 2 min, calendar every 10 min, drive every 30 min
const SYNC_CRON: Record<Connection['kind'], string> = {
  mail: '*/2 * * * *',
  calendar: '*/10 * * * *',
  drive: '*/30 * * * *',
};

async function scheduleSync(boss: PgBoss, conns: Connection[]) {
  for (const c of conns) {
    await boss.schedule('sync', SYNC_CRON[c.kind], { connectionId: c.id }, { key: c.id, tz: 'Europe/Berlin' });
  }
}

export async function startJobs(boss: PgBoss): Promise<void> {
  for (const q of ['import', 'sync', 'process', 'senden']) await boss.createQueue(q);

  await boss.work<{ connectionIds: string[] }>('import', async ([job]) => {
    const r = await runImport(job!.data.connectionIds);
    const conns = await withSystem((tx) => tx.select().from(connections));
    await scheduleSync(boss, conns.filter((c) => job!.data.connectionIds.includes(c.id)));
    return { processed: r.results.size, unreviewed: r.unreviewed };
  });

  await boss.work<{ connectionId: string }>('sync', async ([job]) => {
    // first what Kollege changed (read, archived), then what is new in the mailbox
    const zurueck = await rueckschreiben(job!.data.connectionId);
    if (zurueck.fehler.length) console.error('[rueckschreiben]', zurueck.fehler);
    const r = await syncConnection(job!.data.connectionId);
    for (const entryId of r.newEntryIds) await boss.send('process', { entryId });
    return { new: r.newEntryIds.length, errors: r.errors.length };
  });

  // E43: queued by the app 10 s after "Senden"; recalled mails are skipped under the action lock
  await boss.work<{ actionId: string }>('senden', async ([job]) => {
    const r = await sendeEntwurf(job!.data.actionId);
    if (r.ergebnis === 'gesendet' && r.entryId) await boss.send('process', { entryId: r.entryId });
    return r;
  });

  await boss.work<{ entryId: string }>('process', async ([job]) => {
    const r = await processEntry(job!.data.entryId);
    if (r.state === 'error') throw new Error(r.error);
    return r;
  });

  const conns = await withSystem((tx) => tx.select().from(connections).where(ne(connections.status, 'disabled')));
  const fresh = conns.filter((c) => c.cursor === null);
  if (fresh.length) {
    await boss.send('import', { connectionIds: fresh.map((c) => c.id) }, { singletonKey: 'import' });
  }
  await scheduleSync(boss, conns.filter((c) => c.cursor !== null));
}

