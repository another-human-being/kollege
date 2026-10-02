// A real IMAP server for the stage-4 tests: Dovecot in a temporary directory, plain IMAP
// on 127.0.0.1 (the real mailbox uses TLS on 993). Needs the `dovecot` binary
// (Debian/Ubuntu: apt install dovecot-imapd); without it the IMAP tests are skipped
// with a visible note – the acceptance against the real mailbox stays manual (§13).
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DOVECOT = ['/usr/sbin/dovecot', '/usr/local/sbin/dovecot', '/opt/homebrew/sbin/dovecot'].find(existsSync);

async function freePort(): Promise<number> {
  return new Promise((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => res(port));
    });
  });
}

async function waitFor(port: number, ms = 10_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const ok = await new Promise<boolean>((res) => {
      const c = connect(port, '127.0.0.1', () => { c.end(); res(true); }).on('error', () => res(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`dovecot did not start on port ${port}`);
}

export interface Testpostfach {
  port: number;
  user: string;
  password: string;
  stop(): Promise<void>;
}

export async function startDovecot(): Promise<Testpostfach> {
  if (!DOVECOT) throw new Error('dovecot not installed');
  const dir = mkdtempSync(join(tmpdir(), 'kollege-imap-'));
  chmodSync(dir, 0o755);
  const port = await freePort();
  const user = 'andreas';
  const password = 'test-passwort';
  // mail is stored as the unprivileged dovecot user; the tree must belong to it
  const uid = spawnSync('id', ['-u', 'dovecot']).stdout.toString().trim() || String(process.getuid?.() ?? 1000);
  const gid = spawnSync('id', ['-g', 'dovecot']).stdout.toString().trim() || String(process.getgid?.() ?? 1000);
  writeFileSync(join(dir, 'users'), `${user}:{PLAIN}${password}:${uid}:${gid}::${dir}/home/${user}\n`);
  writeFileSync(join(dir, 'dovecot.conf'), `
base_dir = ${dir}/run
state_dir = ${dir}/state
log_path = ${dir}/dovecot.log
protocols = imap
listen = 127.0.0.1
ssl = no
disable_plaintext_auth = no
auth_mechanisms = plain login
mail_location = maildir:~/Maildir
first_valid_uid = 1
passdb {
  driver = passwd-file
  args = ${dir}/users
}
userdb {
  driver = passwd-file
  args = ${dir}/users
}
service imap-login {
  inet_listener imap {
    address = 127.0.0.1
    port = ${port}
  }
  inet_listener imaps {
    port = 0
  }
}
service anvil {
  chroot =
}
service imap-login {
  chroot =
}
namespace inbox {
  inbox = yes
  mailbox Sent {
    special_use = \\Sent
    auto = subscribe
  }
  mailbox Junk {
    special_use = \\Junk
    auto = subscribe
  }
  mailbox Archiv {
    auto = subscribe
  }
}
`);
  spawnSync('mkdir', ['-p', `${dir}/home/${user}`]);
  spawnSync('chown', ['-R', `${uid}:${gid}`, `${dir}/home`]);
  const proc: ChildProcess = spawn(DOVECOT, ['-F', '-c', join(dir, 'dovecot.conf')], { stdio: 'ignore' });
  await waitFor(port);
  return {
    port, user, password,
    async stop() {
      proc.kill('SIGTERM');
      await new Promise((r) => proc.once('exit', r));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
