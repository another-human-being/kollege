// Connect a mailbox (decision 25): `npm run quelle:imap -- --besitzer <team-mail> --benutzer <RZ-Kennung>`
// or `--team` for the StartHub mailbox. The password never goes on the command line (shell
// history): it is asked for, or read from IMAP_PASSWORT. The login is tested before anything
// is stored; the password is stored encrypted (§4.2). Like the seed, connections are
// infrastructure (decision 1) – the first sync is the import (§7.3).
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, users } from '@/lib/db/schema';
import { ImapConfig, foldersToRead, imapClient } from './imap';

export interface NeuesPostfach {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** team member's address; null = team mailbox (visible to all, §5) */
  ownerEmail: string | null;
  label?: string;
  /** default: today − 12 months (§4.2) */
  importSince?: string;
  folders?: string[];
}

/** login and folder list – no content is read */
export async function pruefeZugang(cfg: ImapConfig): Promise<string[]> {
  const client = imapClient(cfg);
  await client.connect();
  try {
    return foldersToRead(await client.list(), cfg.folders).map((f) => f.path);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export async function postfachVerbinden(p: NeuesPostfach): Promise<{ id: string; folders: string[] }> {
  const config = ImapConfig.parse({ host: p.host, port: p.port, secure: p.secure, user: p.user, password: encrypt(p.password), folders: p.folders });
  const folders = await pruefeZugang(config);
  return withSystem(async (tx) => {
    let userId: string | null = null;
    if (p.ownerEmail) {
      const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, p.ownerEmail.toLowerCase()));
      if (!u) throw new Error(`kein Teammitglied mit ${p.ownerEmail}`);
      userId = u.id;
    }
    const since = p.importSince ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const [c] = await tx
      .insert(connections)
      .values({ user_id: userId, kind: 'mail', provider: 'imap', label: p.label ?? `${p.user}@${p.host}`, config, import_since: since, status: 'ok' })
      .returning({ id: connections.id });
    return { id: c!.id, folders };
  });
}

async function passwort(): Promise<string> {
  if (process.env.IMAP_PASSWORT) return process.env.IMAP_PASSWORT;
  if (!process.stdin.isTTY) throw new Error('Passwort: IMAP_PASSWORT setzen oder im Terminal ausführen');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // hide the typed characters
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
    if (s.includes('Passwort')) process.stdout.write(s);
  };
  const pw = await new Promise<string>((res) => rl.question('Passwort: ', res));
  rl.close();
  process.stdout.write('\n');
  return pw;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: a } = parseArgs({
    options: {
      besitzer: { type: 'string' }, team: { type: 'boolean' }, benutzer: { type: 'string' },
      host: { type: 'string', default: 'imap.uni-augsburg.de' }, port: { type: 'string', default: '993' },
      unverschluesselt: { type: 'boolean' }, label: { type: 'string' }, seit: { type: 'string' }, ordner: { type: 'string', multiple: true },
    },
  });
  if (!a.benutzer || (!a.besitzer && !a.team)) {
    console.error('Aufruf: npm run quelle:imap -- --benutzer <Kennung> (--besitzer <mail> | --team) [--host …] [--port …] [--seit JJJJ-MM-TT] [--ordner INBOX …]');
    process.exit(1);
  }
  postfachVerbinden({
    host: a.host!, port: Number(a.port), secure: !a.unverschluesselt, user: a.benutzer, password: await passwort(),
    ownerEmail: a.team ? null : a.besitzer!, label: a.label, importSince: a.seit, folders: a.ordner,
  })
    .then((r) => console.log(`Verbunden (${r.id}). Ordner: ${r.folders.join(', ')}. Der Import startet mit dem nächsten Start des Workers.`))
    .catch((e: unknown) => { console.error(`Nicht verbunden: ${e instanceof Error ? e.message : String(e)}`); process.exitCode = 1; })
    .finally(() => closeDb());
}
