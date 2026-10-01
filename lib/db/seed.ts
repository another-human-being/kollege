// Seed from fixtures/config.json: team, areas, fixture connections.
// Users and connections have no action in §6 – they are written directly
// (infrastructure exception, decision 2026-10-01). Areas go through runAction.
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { teamConfig } from '@/lib/config';
import { berlinDate } from '@/lib/time';
import { closeDb, withSystem } from './client';
import { areas, connections, users } from './schema';

export interface SeedResult {
  /** user key (config) → id */
  users: Record<string, string>;
  /** connection ids of all fixture connections */
  connections: string[];
}

/** now: reference date for import_since (default: today − 12 months, §4.2) */
export async function seed(opts: { now?: Date } = {}): Promise<SeedResult> {
  const cfg = teamConfig();
  const now = opts.now ?? new Date();
  const since = new Date(now);
  since.setMonth(since.getMonth() - 12);
  const importSince = berlinDate(since);

  const userIds: Record<string, string> = {};
  for (const u of cfg.users) {
    const [row] = await withSystem(async (tx) => {
      await tx.insert(users).values({ name: u.name, email: u.email, is_admin: u.is_admin }).onConflictDoNothing();
      return tx.select({ id: users.id }).from(users).where(eq(users.email, u.email));
    });
    userIds[u.key] = row!.id;
  }

  for (const [i, a] of cfg.areas.entries()) {
    const exists = await withSystem((tx) => tx.select({ id: areas.id }).from(areas).where(eq(areas.key, a.key)));
    if (!exists.length) await runAction({ type: 'system' }, 'area.create', { ...a, sort: i });
  }

  const wanted: (typeof connections.$inferInsert)[] = [
    ...cfg.mailboxes.map((m) => ({
      user_id: m.owner ? userIds[m.owner] : null,
      kind: 'mail' as const,
      label: `Postfach ${m.address}`,
      config: { source: 'mail', mailbox: m.key },
    })),
    ...cfg.users.map((u) => ({
      user_id: userIds[u.key],
      kind: 'calendar' as const,
      label: `Kalender ${u.name}`,
      config: { source: 'calendar', calendar: u.key },
    })),
    { user_id: null, kind: 'drive' as const, label: 'Netzlaufwerk', config: { source: 'drive' } },
  ].map((c) => ({ ...c, provider: 'fixture' as const, import_since: importSince }));

  const connectionIds = await withSystem(async (tx) => {
    const existing = await tx.select().from(connections).where(eq(connections.provider, 'fixture'));
    const ids: string[] = [];
    for (const c of wanted) {
      const found = existing.find((e) => JSON.stringify(e.config) === JSON.stringify(c.config));
      if (found) {
        ids.push(found.id);
      } else {
        const [row] = await tx.insert(connections).values(c).returning({ id: connections.id });
        ids.push(row!.id);
      }
    }
    return ids;
  });

  return { users: userIds, connections: connectionIds };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then((r) => console.log(`Seed: ${Object.keys(r.users).length} Personen, ${r.connections.length} Quellen`))
    .finally(() => closeDb());
}
