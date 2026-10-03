// Job definitions (pg-boss) – BAUVORLAGE §7.
//  import  first connection: sync + process bundled, own queue so it never holds up regular syncs
//  sync    per connection on a schedule; new entries → process
//  process one entry
//  hinweise  rules and advice (§10): daily 06:30 and shortly after each sync (stately: at most one queued)
import { ne } from 'drizzle-orm';
import type { PgBoss } from 'pg-boss';
import { withSystem } from '@/lib/db/client';
import { connections } from '@/lib/db/schema';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { kalenderSchreiben } from '@/lib/kalender/schreiben';
import { sendeTermin } from '@/lib/kalender/senden';
import { rueckschreiben } from '@/lib/mail/rueckschreiben';
import { sendeEntwurf, wartendeSendungen } from '@/lib/mail/senden';
import { processEntry } from '@/lib/pipeline/process';
import { hinweiseLauf } from '@/lib/hinweise';

type Connection = typeof connections.$inferSelect;

// §7.1: mail every 2 min, calendar every 10 min, drive every 30 min
const SYNC_CRON: Record<Connection['kind'], string> = {
  mail: '*/2 * * * *',
  calendar: '*/10 * * * *',
  drive: '*/30 * * * *',
};

/** mail or event: both wait 10 s and go out under the lock of their action (E43) */
async function sende(actionId: string): Promise<{ ergebnis: string; entryId?: string }> {
  const m = await sendeEntwurf(actionId);
  return m.ergebnis === 'nicht_wartend' ? sendeTermin(actionId) : m;
}

async function scheduleSync(boss: PgBoss, conns: Connection[]) {
  for (const c of conns) {
    await boss.schedule('sync', SYNC_CRON[c.kind], { connectionId: c.id }, { key: c.id, tz: 'Europe/Berlin' });
  }
}

export async function startJobs(boss: PgBoss): Promise<void> {
  for (const q of ['import', 'sync', 'process', 'senden', 'senden-nachholen']) await boss.createQueue(q);
  await boss.createQueue('hinweise', { policy: 'stately' });
  // after a sync the new entries are still being processed – the run waits a little for them
  const hinweiseBald = () => boss.send('hinweise', {}, { startAfter: 60 });

  await boss.work<{ connectionIds: string[] }>('import', async ([job]) => {
    const r = await runImport(job!.data.connectionIds);
    await hinweiseBald();
    const conns = await withSystem((tx) => tx.select().from(connections));
    await scheduleSync(boss, conns.filter((c) => job!.data.connectionIds.includes(c.id)));
    return { processed: r.results.size, unreviewed: r.unreviewed };
  });

  await boss.work<{ connectionId: string }>('sync', async ([job]) => {
    // first what Kollege changed (read, archived), then what is new in the mailbox
    const zurueck = await rueckschreiben(job!.data.connectionId);
    if (zurueck.fehler.length) console.error('[rueckschreiben]', zurueck.fehler);
    const kalender = await kalenderSchreiben(job!.data.connectionId);
    if (kalender.fehler.length) console.error('[kalender schreiben]', kalender.fehler);
    const r = await syncConnection(job!.data.connectionId);
    for (const entryId of r.newEntryIds) await boss.send('process', { entryId });
    await hinweiseBald();
    return { new: r.newEntryIds.length, errors: r.errors.length };
  });

  // E43: queued by the app 10 s after "Senden"; recalled mails are skipped under the action lock
  await boss.work<{ actionId: string }>('senden', async ([job]) => {
    const r = await sende(job!.data.actionId);
    if (r.ergebnis === 'gesendet' && r.entryId) await boss.send('process', { entryId: r.entryId });
    return r;
  });

  // safety net: whatever still waits past its 10 s is sent now (the send job under the lock decides)
  await boss.work('senden-nachholen', async () => {
    const ids = await wartendeSendungen();
    for (const actionId of ids) {
      const r = await sende(actionId);
      if (r.ergebnis === 'gesendet' && r.entryId) await boss.send('process', { entryId: r.entryId });
    }
    return { nachgeholt: ids.length };
  });
  await boss.schedule('senden-nachholen', '* * * * *', {}, { tz: 'Europe/Berlin' });

  await boss.work('hinweise', async () => hinweiseLauf());
  await boss.schedule('hinweise', '30 6 * * *', {}, { tz: 'Europe/Berlin' });

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

