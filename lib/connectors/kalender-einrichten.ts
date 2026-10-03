// Connect a calendar (decision 33): `npm run quelle:kalender -- --url <CalDAV> --benutzer <login> --besitzer <team-mail>`
//   iCloud (Apple Kalender): --url https://caldav.icloud.com/ with an app-specific password
//   (appleid.apple.com → Anmeldung und Sicherheit → App-spezifische Passwörter)
// Password as with mail: asked for or IMAP_PASSWORT/KALENDER_PASSWORT, tested before storing, encrypted.
// --kalender limits which calendars are read (names) – private calendars stay out of Kollege.
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, users } from '@/lib/db/schema';
import { CaldavConfig, caldavClient, kalenderListe } from './caldav';

export interface NeuerKalender {
  url: string;
  user: string;
  password: string;
  ownerEmail: string;
  /** display names of the calendars to read; default: all */
  kalender?: string[];
  /** display name of the calendar new events go into; default: the first read one */
  schreibkalender?: string;
  importSince?: string;
}

export async function kalenderVerbinden(p: NeuerKalender): Promise<{ id: string; kalender: string[] }> {
  const base = CaldavConfig.parse({ url: p.url, user: p.user, password: encrypt(p.password), address: p.ownerEmail.toLowerCase() });
  const client = await caldavClient(base);
  const alle = await kalenderListe(client, base);
  const name = (c: { displayName?: unknown; url: string }) => (typeof c.displayName === 'string' ? c.displayName : c.url);
  const gewaehlt = p.kalender?.length ? alle.filter((c) => p.kalender!.includes(name(c))) : alle;
  if (!gewaehlt.length) throw new Error(`keine passenden Kalender (vorhanden: ${alle.map(name).join(', ') || 'keine'})`);
  const schreib = p.schreibkalender ? gewaehlt.find((c) => name(c) === p.schreibkalender) : gewaehlt[0];
  if (!schreib) throw new Error(`Kalender „${p.schreibkalender}“ ist nicht unter den gelesenen`);
  const config = CaldavConfig.parse({ ...base, calendars: gewaehlt.map((c) => c.url), write_calendar: schreib.url });
  return withSystem(async (tx) => {
    const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, p.ownerEmail.toLowerCase()));
    if (!u) throw new Error(`kein Teammitglied mit ${p.ownerEmail}`);
    const since = p.importSince ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const [c] = await tx
      .insert(connections)
      .values({ user_id: u.id, kind: 'calendar', provider: 'caldav', label: `Kalender ${gewaehlt.map(name).join(', ')}`, config, import_since: since, status: 'ok' })
      .returning({ id: connections.id });
    return { id: c!.id, kalender: gewaehlt.map(name) };
  });
}

async function passwort(): Promise<string> {
  const env = process.env.KALENDER_PASSWORT ?? process.env.IMAP_PASSWORT;
  if (env) return env;
  if (!process.stdin.isTTY) throw new Error('Passwort: KALENDER_PASSWORT setzen oder im Terminal ausführen');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => { if (s.includes('Passwort')) process.stdout.write(s); };
  const pw = await new Promise<string>((res) => rl.question('Passwort: ', res));
  rl.close();
  process.stdout.write('\n');
  return pw;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: a } = parseArgs({
    options: {
      url: { type: 'string' }, benutzer: { type: 'string' }, besitzer: { type: 'string' },
      kalender: { type: 'string', multiple: true }, schreibkalender: { type: 'string' }, seit: { type: 'string' },
    },
  });
  if (!a.url || !a.benutzer || !a.besitzer) {
    console.error('Aufruf: npm run quelle:kalender -- --url <CalDAV-URL> --benutzer <Login> --besitzer <Team-Adresse> [--kalender <Name> …] [--schreibkalender <Name>] [--seit JJJJ-MM-TT]');
    process.exit(1);
  }
  kalenderVerbinden({ url: a.url, user: a.benutzer, password: await passwort(), ownerEmail: a.besitzer, kalender: a.kalender, schreibkalender: a.schreibkalender, importSince: a.seit })
    .then((r) => console.log(`Verbunden (${r.id}). Kalender: ${r.kalender.join(', ')}. Der Import startet mit dem nächsten Start des Workers.`))
    .catch((e: unknown) => { console.error(`Nicht verbunden: ${e instanceof Error ? e.message : String(e)}`); process.exitCode = 1; })
    .finally(() => closeDb());
}
