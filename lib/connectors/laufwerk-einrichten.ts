// Connect the team drive (stage 7): `npm run quelle:laufwerk -- [--pfad /mnt/drive] [--unc '\\server\freigabe'] [--seit JJJJ-MM-TT]`
// The SMB share is mounted by the operating system (read-only is enough), e.g. in /etc/fstab:
//   //fileserver.uni-augsburg.de/starthub /mnt/drive cifs credentials=/etc/kollege-smb,ro,uid=…  0 0
// The SMB password stays in the system's credentials file and never reaches Kollege.
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections } from '@/lib/db/schema';
import { LaufwerkConfig } from './laufwerk';

export async function laufwerkVerbinden(p: { root: string; unc?: string; importSince?: string }): Promise<{ id: string }> {
  const s = await stat(p.root).catch(() => null);
  if (!s?.isDirectory()) throw new Error(`${p.root} ist kein Ordner – ist das Laufwerk eingehängt?`);
  const config = LaufwerkConfig.parse({ root: p.root, unc: p.unc });
  const since = p.importSince ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  return withSystem(async (tx) => {
    // a team source: user_id null, visible to the whole team (§5)
    const [c] = await tx.insert(connections)
      .values({ user_id: null, kind: 'drive', provider: 'smb', label: 'Laufwerk', config, import_since: since, status: 'ok' })
      .returning({ id: connections.id });
    return { id: c!.id };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: a } = parseArgs({ options: { pfad: { type: 'string' }, unc: { type: 'string' }, seit: { type: 'string' } } });
  const root = a.pfad ?? process.env.DRIVE_MOUNT ?? '/mnt/drive';
  laufwerkVerbinden({ root, unc: a.unc, importSince: a.seit })
    .then((r) => console.log(`Verbunden (${r.id}): ${root}. Der Import startet mit dem nächsten Start des Workers.`))
    .catch((e: unknown) => { console.error(`Nicht verbunden: ${e instanceof Error ? e.message : String(e)}`); process.exitCode = 1; })
    .finally(() => closeDb());
}
