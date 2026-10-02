// Stage 5 (§13): mail client – send, recall within 10 s (E43), write back read state and
// archive, against a real IMAP server (Dovecot) and a local SMTP server that records what
// arrives. Acceptance: a sent mail does not appear twice after the next sync.
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { ImapFlow } from 'imapflow';
import { createServer } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction, undoAction } from '@/lib/actions';
import { postfachVerbinden } from '@/lib/connectors/einrichten';
import { closeDb, withSystem } from '@/lib/db/client';
import { actions, entries, mailCopies } from '@/lib/db/schema';
import { rueckschreiben } from '@/lib/mail/rueckschreiben';
import { sendeEntwurf } from '@/lib/mail/senden';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { DOVECOT, startDovecot, type Testpostfach } from './dovecot';
import { expectRejects, importFixtures, NOW } from './helpers';

process.env.APP_SECRET ??= 'test-app-secret-0123456789abcdef0123';

const fast = () => new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: 'text', text: JSON.stringify({ relevant: true, confidence: 'high', summary: 'Mail.', matter: null, people: [], tasks: [] }) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
    warnings: [],
  }),
});

interface Empfangen { from: string; to: string[]; raw: string }

async function smtpServer(user: string, pass: string) {
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

const raw = (id: string, from: string, subject: string, date: string) =>
  [`Message-ID: <${id}>`, `From: ${from}`, 'To: Andreas <andreas@gruendung.uni-augsburg.example>', `Subject: ${subject}`, `Date: ${new Date(date).toUTCString()}`, '', 'Hallo', ''].join('\r\n');

describe.skipIf(!DOVECOT)('Stufe 5: Mail-Client', () => {
  let box: Testpostfach;
  let smtp: Awaited<ReturnType<typeof smtpServer>>;
  let imap: ImapFlow;
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  let connId: string;
  const andreas = () => ({ type: 'user' as const, userId: fx.users.andreas! });
  const entryByMid = async (mid: string) => (await withSystem((tx) => tx.select().from(entries).where(eq(entries.dedupe_key, mid))));
  const flags = async (folder: string, mid: string) => {
    const lock = await imap.getMailboxLock(folder);
    try {
      // let pending EXPUNGEs of other sessions arrive (servers may not send them during FETCH)
      await imap.noop();
      for await (const m of imap.fetch('1:*', { envelope: true, flags: true })) if (m.envelope?.messageId === mid) return m.flags;
      return null;
    } finally { lock.release(); }
  };
  const entwurf = async (extra: Record<string, unknown> = {}) =>
    (await runAction<{ id: string }>(andreas(), 'mail.draft', { connection_id: connId, to: ['lisa@solaro.example'], subject: 'Termin', body: 'Hallo Lisa', ...extra })).result.id;

  beforeAll(async () => {
    fx = await importFixtures();
    box = await startDovecot();
    smtp = await smtpServer(box.user, box.password);
    imap = new ImapFlow({ host: '127.0.0.1', port: box.port, secure: false, auth: { user: box.user, pass: box.password }, logger: false });
    await imap.connect();
    await imap.append('INBOX', raw('lisa-20@solaro.example', 'Lisa Meier <lisa@solaro.example>', 'Unterlagen', '2026-09-30T09:00:00Z'), [], new Date('2026-09-30T09:00:00Z'));
    await imap.append('INBOX', raw('lisa-21@solaro.example', 'Lisa Meier <lisa@solaro.example>', 'Ablage', '2026-09-30T10:00:00Z'), [], new Date('2026-09-30T10:00:00Z'));
    ({ id: connId } = await postfachVerbinden({
      host: '127.0.0.1', port: box.port, secure: false, user: box.user, password: box.password,
      ownerEmail: 'andreas@gruendung.uni-augsburg.example', importSince: '2026-01-01',
      smtp: { host: '127.0.0.1', port: smtp.port, secure: false },
    }));
    await runImport([connId], { model: fast(), now: NOW, importId: 'mail-test' });
  }, 120_000);

  afterAll(async () => {
    await imap?.logout().catch(() => undefined);
    await smtp?.close();
    await box?.stop();
    await closeDb();
  });

  it('acceptance: a sent mail is one entry – also after the next sync finds it in "Gesendet"', async () => {
    const id = await entwurf({ cc: ['tom@solaro.example'], bcc: ['julia@gruendung.uni-augsburg.example'] });
    const { actionId, result } = await runAction<{ message_id: string }>(andreas(), 'mail.send', { id });
    expect(await sendeEntwurf(actionId)).toMatchObject({ ergebnis: 'gesendet', entryId: id });

    const out = smtp.empfangen.at(-1)!;
    expect(out.from).toBe('andreas@gruendung.uni-augsburg.example');
    expect(out.to.sort()).toEqual(['julia@gruendung.uni-augsburg.example', 'lisa@solaro.example', 'tom@solaro.example']);
    // long header lines are folded (RFC 5322)
    expect(out.raw.replace(/\r\n[ \t]+/g, ' ')).toContain(`Message-ID: ${result.message_id}`);
    expect(out.raw).not.toMatch(/^Bcc:/m);

    const [e] = await entryByMid(result.message_id);
    expect(e).toMatchObject({ id, kind: 'mail', processing_state: 'pending', meta: expect.objectContaining({ via_kollege: true }) });
    expect(await flags('Sent', result.message_id)).toContain('\\Seen');

    const r = await syncConnection(connId, { now: NOW });
    expect(r.newEntryIds).toHaveLength(0);
    expect(r.knownEntryIds).toContain(id);
    expect(await entryByMid(result.message_id)).toHaveLength(1);
  });

  it('recalled within the 10 seconds: nothing goes out, the draft is back', async () => {
    const before = smtp.empfangen.length;
    const id = await entwurf({ subject: 'Doch nicht' });
    const { actionId } = await runAction(andreas(), 'mail.send', { id });
    await undoAction(actionId, fx.users.andreas!);
    expect(await sendeEntwurf(actionId)).toMatchObject({ ergebnis: 'zurueckgeholt' });
    expect(smtp.empfangen).toHaveLength(before);
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, id)));
    expect(e!.kind).toBe('draft');
    expect((e!.meta as { send?: unknown }).send).toBeUndefined();
  });

  it('once out, there is no undo any more', async () => {
    const id = await entwurf({ subject: 'Raus ist raus' });
    const { actionId } = await runAction(andreas(), 'mail.send', { id });
    await sendeEntwurf(actionId);
    await expectRejects(undoAction(actionId, fx.users.andreas!), /cannot be undone/);
    const [a] = await withSystem((tx) => tx.select().from(actions).where(eq(actions.id, actionId)));
    expect(a!.inverse).toBeNull();
  });

  it('the model may draft, but never send (hard rule)', async () => {
    const { result } = await runAction<{ id: string }>({ type: 'model', userId: fx.users.andreas! }, 'mail.draft', { connection_id: connId, to: ['lisa@solaro.example'], subject: 'Entwurf', body: 'x' });
    await expectRejects(runAction({ type: 'model', userId: fx.users.andreas! }, 'mail.send', { id: result.id }), /actor model may not run external action mail.send/);
    const [d] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, result.id)));
    expect(d).toMatchObject({ kind: 'draft', visible_to: [fx.users.andreas], meta: expect.objectContaining({ by_model: true }) });
  });

  it('a reply carries In-Reply-To and stays in the thread', async () => {
    const [lisa] = await entryByMid('<lisa-20@solaro.example>');
    const id = await entwurf({ subject: 'Re: Unterlagen', art: 'antwort', bezug_entry_id: lisa!.id });
    const { actionId } = await runAction(andreas(), 'mail.send', { id });
    await sendeEntwurf(actionId);
    expect(smtp.empfangen.at(-1)!.raw).toContain('In-Reply-To: <lisa-20@solaro.example>');
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, id)));
    expect(e!.thread_key).toBe(lisa!.thread_key);
  });

  it('read state goes back to the mailbox – and undo too', async () => {
    const [lisa] = await entryByMid('<lisa-20@solaro.example>');
    expect(await flags('INBOX', '<lisa-20@solaro.example>')).not.toContain('\\Seen');
    const { actionId } = await runAction(andreas(), 'mail.mark_read', { entry_ids: [lisa!.id], seen: true });
    expect((await rueckschreiben(connId)).fehler).toEqual([]);
    expect(await flags('INBOX', '<lisa-20@solaro.example>')).toContain('\\Seen');
    await undoAction(actionId, fx.users.andreas!);
    await rueckschreiben(connId);
    expect(await flags('INBOX', '<lisa-20@solaro.example>')).not.toContain('\\Seen');
  });

  it('archive moves the mail in the mailbox; the next sync does not duplicate it; undo moves it back', async () => {
    const [m] = await entryByMid('<lisa-21@solaro.example>');
    const { actionId } = await runAction(andreas(), 'mail.archive', { entry_ids: [m!.id] });
    expect((await rueckschreiben(connId)).fehler).toEqual([]);
    expect(await flags('INBOX', '<lisa-21@solaro.example>')).toBeNull();
    expect(await flags('Archiv', '<lisa-21@solaro.example>')).not.toBeNull();
    const [copy] = await withSystem((tx) => tx.select().from(mailCopies).where(eq(mailCopies.entry_id, m!.id)));
    expect(copy).toMatchObject({ folder: 'Archiv', pending: false, target_folder: null });

    const r = await syncConnection(connId, { now: NOW });
    expect(r.newEntryIds).toHaveLength(0);
    expect(await withSystem((tx) => tx.select().from(mailCopies).where(eq(mailCopies.entry_id, m!.id)))).toHaveLength(1);

    await undoAction(actionId, fx.users.andreas!);
    await rueckschreiben(connId);
    expect(await flags('INBOX', '<lisa-21@solaro.example>')).not.toBeNull();
  });

  it("Julia cannot change Andreas' copies", async () => {
    const [m] = await entryByMid('<lisa-20@solaro.example>');
    await expectRejects(runAction({ type: 'user', userId: fx.users.julia! }, 'mail.mark_read', { entry_ids: [m!.id] }), /not found|no copy/);
    const [d] = await withSystem((tx) => tx.select().from(entries).where(and(eq(entries.kind, 'draft'), eq(entries.author_user_id, fx.users.andreas!))));
    if (d) await expectRejects(runAction({ type: 'user', userId: fx.users.julia! }, 'mail.send', { id: d.id }), /not found/);
  });

  it('safety net: a mail whose job got lost is found and sent by the worker sweep', async () => {
    const { wartendeSendungen } = await import('@/lib/mail/senden');
    const id = await entwurf({ subject: 'Job verloren' });
    const { actionId } = await runAction(andreas(), 'mail.send', { id });
    expect(await wartendeSendungen()).not.toContain(actionId);
    // pretend its 10 s ran out long ago without any job
    await withSystem((tx) => tx.execute(sql`UPDATE entries SET meta = jsonb_set(meta, '{send,send_after}', to_jsonb((now() - interval '1 minute')::text)) WHERE id = ${id}`));
    expect(await wartendeSendungen()).toContain(actionId);
    expect(await sendeEntwurf(actionId)).toMatchObject({ ergebnis: 'gesendet' });
    expect(await wartendeSendungen()).not.toContain(actionId);
  });

  it('SMTP refuses: the mail stays a draft with the reason, nothing is lost', async () => {
    const id = await entwurf({ subject: 'Server weg' });
    await smtp.close();
    const { actionId } = await runAction(andreas(), 'mail.send', { id });
    const r = await sendeEntwurf(actionId);
    expect(r.ergebnis).toBe('fehler');
    const [e] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.id, id)));
    expect(e).toMatchObject({ kind: 'draft', meta: expect.objectContaining({ send: expect.objectContaining({ status: 'failed' }) }) });
    await undoAction(actionId, fx.users.andreas!);
  });
});
