// A local SMTP server for tests that records what arrives (stage 5/6).
import { createServer } from 'node:net';
import { SMTPServer } from 'smtp-server';

export interface Empfangen { from: string; to: string[]; raw: string }

export async function smtpServer(user: string, pass: string) {
  const port = await new Promise<number>((res) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); }); });
  const empfangen: Empfangen[] = [];
  const server = new SMTPServer({
    secure: false, disabledCommands: ['STARTTLS'], allowInsecureAuth: true, logger: false,
    onAuth(auth, _s, cb) { cb(auth.username === user && auth.password === pass ? null : new Error('falsch'), { user: auth.username }); },
    onData(stream, session, cb) {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => {
        empfangen.push({ from: (session.envelope.mailFrom as { address: string }).address, to: session.envelope.rcptTo.map((r) => r.address), raw: Buffer.concat(chunks).toString() });
        cb();
      });
    },
  });
  await new Promise<void>((res) => server.listen(port, '127.0.0.1', res));
  return { port, empfangen, close: () => new Promise<void>((res) => server.close(() => res())) };
}

