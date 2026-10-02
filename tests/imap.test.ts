// Acceptance stage 4 (§13) against a real IMAP server (Dovecot, tests/dovecot.ts) with a
// mock for the fast model: newsletter skipped, known senders assigned by rule, new
// inquiries unreviewed – plus the robustness rules of §12 and the import limits of §7.3.
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { ImapFlow } from 'imapflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeImapConnector } from '@/lib/connectors/imap';
import { postfachVerbinden } from '@/lib/connectors/einrichten';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, entries, links, matters, modelCalls, orgs, people } from '@/lib/db/schema';
import { runImport } from '@/lib/pipeline/import';
import { syncConnection } from '@/lib/pipeline/ingest';
import { DOVECOT, startDovecot, type Testpostfach } from './dovecot';
import { importFixtures, NOW } from './helpers';

process.env.APP_SECRET ??= 'test-app-secret-0123456789abcdef0123';
if (!DOVECOT) console.warn('IMAP-Tests übersprungen: dovecot fehlt (apt install dovecot-imapd)');

const mail = (o: { id?: string; from: string; to?: string; subject: string; date: string; body?: string; headers?: string[]; attachment?: { name: string; mime: string; data: Buffer } }) => {
  const head = [
    ...(o.id ? [`Message-ID: <${o.id}>`] : []),
    `From: ${o.from}`, `To: ${o.to ?? 'Andreas <andreas@gruendung.uni-augsburg.example>'}`,
    `Subject: ${o.subject}`, `Date: ${new Date(o.date).toUTCString()}`, 'MIME-Version: 1.0', ...(o.headers ?? []),
  ];
  if (!o.attachment) return [...head, 'Content-Type: text/plain; charset=utf-8', '', o.body ?? 'Hallo', ''].join('\r\n');
  return [...head, 'Content-Type: multipart/mixed; boundary="b1"', '', '--b1', 'Content-Type: text/plain; charset=utf-8', '', o.body ?? 'Anbei.', '--b1',
    `Content-Type: ${o.attachment.mime}; name="${o.attachment.name}"`, `Content-Disposition: attachment; filename="${o.attachment.name}"`,
    'Content-Transfer-Encoding: base64', '', o.attachment.data.toString('base64'), '--b1--', ''].join('\r\n');
};

/** fast model stand-in: a new inquiry becomes a new org/person/matter (medium), the rest is plain */
const fast = () => new MockLanguageModelV4({
  doGenerate: async (opts) => {
    const prompt = JSON.stringify(opts.prompt);
    const neu = prompt.includes('nordwind-energy.example');
    const answer = neu
      ? {
          relevant: true, area_key: 'founding_teams', confidence: 'medium', summary: 'Nordwind Energy fragt nach einer Erstberatung.',
          org: { new: { name: 'Nordwind Energy', role: 'founding_team' } },
          people: [{ new: { name: 'Mara Nordwind', email: 'mara@nordwind-energy.example', org: 'Nordwind Energy' } }],
          matter: { new: { title: 'Erstberatung', area_key: 'founding_teams', fields: {} } }, tasks: [],
        }
      : { relevant: true, confidence: 'high', summary: 'Rückfrage.', matter: null, people: [], tasks: [] };
    return {
      content: [{ type: 'text', text: JSON.stringify(answer) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 20, text: 20, reasoning: undefined } },
      warnings: [],
    };
  },
});

function pdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n';
  const off: number[] = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

describe.skipIf(!DOVECOT)('Stufe 4: Mail-Eingang über IMAP', () => {
  let box: Testpostfach;
  let imap: ImapFlow;
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  let connId: string;
  const byTitle = async (title: string) => (await withSystem((tx) => tx.select().from(entries).where(eq(entries.title, title))));

  beforeAll(async () => {
    fx = await importFixtures();
    box = await startDovecot();
    imap = new ImapFlow({ host: '127.0.0.1', port: box.port, secure: false, auth: { user: box.user, pass: box.password }, logger: false });
    await imap.connect();
    const put = (folder: string, raw: string) => imap.append(folder, raw, [], new Date(/^Date: (.*)$/m.exec(raw)![1]!));
    await put('INBOX', mail({ id: 'nl-1@news.example', from: 'Gründerszene <news@news.example>', subject: 'Newsletter Oktober', date: '2026-09-28T07:00:00Z',
      headers: ['List-Unsubscribe: <mailto:off@news.example>'] }));
    await put('INBOX', mail({ id: 'lisa-9@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Frage zum Zeitplan', date: '2026-09-29T09:00:00Z',
      body: 'Hallo Andreas, passt es, wenn wir das Pitchdeck am Montag schicken?' }));
    await put('INBOX', mail({ id: 'anfrage-1@nordwind-energy.example', from: 'Mara Nordwind <mara@nordwind-energy.example>', subject: 'Anfrage Erstberatung',
      date: '2026-09-30T10:00:00Z', body: 'Wir sind ein Team aus Augsburg und würden gern zur Gründungsberatung kommen.' }));
    await put('INBOX', mail({ from: 'Kaputt <x@kaputt.example>', subject: 'Ohne Message-ID', date: '2026-09-30T11:00:00Z' }));
    await put('INBOX', mail({ id: 'alt-1@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Uralte Mail', date: '2025-03-01T10:00:00Z' }));
    await put('INBOX', mail({ id: 'pdf-1@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Unser Onepager', date: '2026-09-30T12:00:00Z',
      attachment: { name: 'Onepager.pdf', mime: 'application/pdf', data: pdf('Balkonkraftwerke mit Speicher') } }));
    await put('Junk', mail({ id: 'spam-1@spam.example', from: 'Spam <win@spam.example>', subject: 'Gewinn', date: '2026-09-30T13:00:00Z' }));
    // the same mail in two folders: one entry
    await put('Archiv', mail({ id: 'lisa-9@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Frage zum Zeitplan', date: '2026-09-29T09:00:00Z' }));

    ({ id: connId } = await postfachVerbinden({
      host: '127.0.0.1', port: box.port, secure: false, user: box.user, password: box.password,
      ownerEmail: 'andreas@gruendung.uni-augsburg.example', importSince: '2025-10-01',
    }));
    await runImport([connId], { model: fast(), now: NOW, importId: 'imap-test' });
  }, 120_000);

  afterAll(async () => {
    await imap?.logout().catch(() => undefined);
    await box?.stop();
    await closeDb();
  });

  it('stores the password only encrypted', async () => {
    const [c] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connId)));
    expect(JSON.stringify(c!.config)).not.toContain(box.password);
    expect((c!.config as { password: string }).password).toMatch(/^enc:v1:/);
  });

  it('skips the newsletter (stored, not linked)', async () => {
    const [nl] = await byTitle('Newsletter Oktober');
    expect(nl).toMatchObject({ processing_state: 'skipped', meta: expect.objectContaining({ skip_reason: 'bulk' }) });
    expect(await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, nl!.id)))).toHaveLength(0);
  });

  it('assigns a known sender by rule', async () => {
    const [m] = await byTitle('Frage zum Zeitplan');
    const [lisa] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Lisa Meier')));
    const l = await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, m!.id)));
    expect(l).toEqual(expect.arrayContaining([
      expect.objectContaining({ target_type: 'person', target_id: lisa!.id, origin: 'rule' }),
      expect.objectContaining({ target_type: 'org', origin: 'rule' }),
    ]));
    expect(m).toMatchObject({ visibility: 'restricted', visible_to: [fx.users.andreas], historical: true });
  });

  it('creates a new inquiry as unreviewed: organisation, person and topic', async () => {
    const [o] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Nordwind Energy')));
    const [p] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Mara Nordwind')));
    const [t] = await withSystem((tx) => tx.select().from(matters).where(and(eq(matters.title, 'Erstberatung'), eq(matters.org_id, o!.id))));
    expect([o?.review_state, p?.review_state, t?.review_state]).toEqual(['unreviewed', 'unreviewed', 'unreviewed']);
    expect(o!.domains).toEqual(['nordwind-energy.example']);
  });

  it('reads no junk, nothing before import_since, each mail once', async () => {
    expect(await byTitle('Gewinn')).toHaveLength(0);
    expect(await byTitle('Uralte Mail')).toHaveLength(0);
    expect(await byTitle('Frage zum Zeitplan')).toHaveLength(1);
  });

  it('a mail without Message-ID becomes a sync error, the others go through', async () => {
    const err = await withSystem((tx) => tx.select().from(entries).where(and(eq(entries.kind, 'system'), eq(entries.connection_id, connId))));
    expect(err).toHaveLength(1);
    expect(err[0]!.body_text).toContain('Message-ID');
  });

  it('turns the PDF attachment into a file entry with its text', async () => {
    const [m] = await byTitle('Unser Onepager');
    const [f] = await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'mail_entry_id' = ${m!.id}`));
    expect(f).toMatchObject({ kind: 'file', title: 'Onepager.pdf', visible_to: [fx.users.andreas] });
    expect(f!.body_text).toContain('Balkonkraftwerke mit Speicher');
  });

  it('logs every fast call without user and content', async () => {
    const calls = await withSystem((tx) => tx.select().from(modelCalls).where(eq(modelCalls.role, 'fast')));
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls.every((c) => c.user_id === null && c.purpose === 'import' && c.error === null)).toBe(true);
  });

  it('the next sync reads only what is new', async () => {
    await imap.append('INBOX', mail({ id: 'neu-1@solaro.example', from: 'Tom Kraus <tom@solaro.example>', subject: 'Neuer Finanzplan', date: '2026-10-01T08:30:00Z' }));
    const r = await syncConnection(connId, { now: NOW });
    expect(r.isImport).toBe(false);
    expect(r.newEntryIds).toHaveLength(1);
    expect(r.knownEntryIds).toHaveLength(0);
    const [e] = await byTitle('Neuer Finanzplan');
    expect(e).toMatchObject({ historical: false, processing_state: 'pending' });
  });

  it('a large import goes in batches; the date limit holds for older mail with a higher UID', async () => {
    await imap.mailboxCreate('Batch');
    for (let i = 1; i <= 5; i++) {
      await imap.append('Batch', mail({ id: `batch-${i}@solaro.example`, from: 'Lisa Meier <lisa@solaro.example>', subject: `Batch ${i}`, date: `2026-09-0${i}T10:00:00Z` }));
    }
    // filed later, so a higher UID – but dated before import_since
    await imap.append('Batch', mail({ id: 'batch-alt@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Batch alt', date: '2024-12-01T10:00:00Z' }));
    const [c] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connId)));
    const conn = { ...c!, config: { ...(c!.config as object), folders: ['Batch'] } };
    const connector = makeImapConnector(2);
    const seen: string[] = [];
    let cursor: unknown = null;
    for (let calls = 0; calls < 10; calls++) {
      const r = await connector.sync(conn, cursor);
      seen.push(...r.items.map((i) => i.title!));
      cursor = r.cursor;
      if (!r.more) break;
    }
    expect(seen).toEqual(['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5']);
    // later calls: nothing old sneaks in
    await imap.append('Batch', mail({ id: 'batch-neu@solaro.example', from: 'Lisa Meier <lisa@solaro.example>', subject: 'Batch neu', date: '2026-10-01T09:00:00Z' }));
    const r = await connector.sync(conn, cursor);
    expect(r.items.map((i) => i.title)).toEqual(['Batch neu']);
  });
});
