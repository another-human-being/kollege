// A real CalDAV server for the stage-6 tests: Radicale in a temporary directory, plain HTTP on
// 127.0.0.1 (iCloud and the Uni use HTTPS). Needs `radicale` (apt install radicale); without it
// the CalDAV tests are skipped with a visible note.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const RADICALE = ['/usr/bin/radicale', '/usr/local/bin/radicale', '/opt/homebrew/bin/radicale'].find(existsSync);

async function freePort(): Promise<number> {
  return new Promise((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => res(port));
    });
  });
}

async function waitFor(port: number, ms = 15_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const ok = await new Promise<boolean>((res) => {
      const c = connect(port, '127.0.0.1', () => { c.end(); res(true); }).on('error', () => res(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`radicale did not start on port ${port}`);
}

export interface Testkalender {
  url: string;
  user: string;
  password: string;
  stop(): Promise<void>;
}

export async function startRadicale(): Promise<Testkalender> {
  if (!RADICALE) throw new Error('radicale not installed');
  const dir = mkdtempSync(join(tmpdir(), 'kollege-caldav-'));
  const port = await freePort();
  const user = 'andreas';
  const password = 'kalender-passwort';
  writeFileSync(join(dir, 'users'), `${user}:${password}\n`);
  writeFileSync(join(dir, 'config'), `
[server]
hosts = 127.0.0.1:${port}
[auth]
type = htpasswd
htpasswd_filename = ${dir}/users
htpasswd_encryption = plain
[storage]
filesystem_folder = ${dir}/collections
[rights]
type = owner_only
[logging]
level = warning
`);
  const proc: ChildProcess = spawn(RADICALE, ['--config', join(dir, 'config')], { stdio: 'ignore' });
  await waitFor(port);
  return {
    url: `http://127.0.0.1:${port}/`,
    user,
    password,
    async stop() {
      proc.kill('SIGTERM');
      await new Promise((r) => proc.once('exit', r));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
