// The app's way into the worker queue (pg-boss): only sending jobs, no processing, no
// maintenance, no schedules – those run in the worker (worker/index.ts).
import { PgBoss } from 'pg-boss';

let boss: Promise<PgBoss> | undefined;

function client(): Promise<PgBoss> {
  boss ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    // creates its schema if the worker has not yet (pg-boss locks its migration)
    const b = new PgBoss({ connectionString: url, supervise: false, schedule: false });
    b.on('error', (e) => console.error('[queue]', e));
    await b.start();
    return b;
  })();
  return boss;
}

const angelegt = new Set<string>();

export async function einreihen(queue: string, data: object, opts: { startAfter?: number } = {}): Promise<void> {
  const b = await client();
  // the worker may not have run yet: the queue must exist before a job can go in
  if (!angelegt.has(queue)) {
    if (!(await b.getQueue(queue))) await b.createQueue(queue).catch(() => undefined);
    angelegt.add(queue);
  }
  await b.send(queue, data, opts);
}

export async function queueStop(): Promise<void> {
  if (boss) await (await boss).stop();
  boss = undefined;
}
