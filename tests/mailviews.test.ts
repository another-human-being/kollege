// The mail view (§11, E26, E38, E13) on the imported fixtures.
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { entries } from '@/lib/db/schema';
import { mailThread, postfaecher, threadListe } from '@/lib/views/mail';
import { createEntry, importFixtures } from './helpers';

let fx: Awaited<ReturnType<typeof importFixtures>>;
beforeAll(async () => { fx = await importFixtures(); });
afterAll(() => closeDb());
const u = (k: string) => fx.users[k]!;

describe('mail view', () => {
  it('knows my mailbox and the team mailbox with their addresses', async () => {
    const p = await postfaecher(u('andreas'));
    expect(p.mein?.address).toBe('andreas@gruendung.uni-augsburg.example');
    expect(p.starthub?.address).toBe('starthub@gruendung.uni-augsburg.example');
  });

  it('my inbox lists only threads I can read; unread until I read them', async () => {
    const liste = await threadListe(u('andreas'), { postfach: 'mein', ordner: 'eingang' });
    expect(liste.length).toBeGreaterThan(0);
    for (const t of liste) expect(await mailThread(u('andreas'), t.thread)).not.toBeNull();
    const t = liste[0]!;
    expect(t.ungelesen).toBe(true);
    const ids = (await mailThread(u('andreas'), t.thread))!.nachrichten.map((m) => m.id);
    await runAction({ type: 'user', userId: u('andreas') }, 'mail.mark_read', { entry_ids: ids });
    const nachher = await threadListe(u('andreas'), { postfach: 'mein', ordner: 'eingang', filter: 'ungelesen' });
    expect(nachher.map((x) => x.thread)).not.toContain(t.thread);
  });

  it("Julia's inbox does not show Andreas' private mails", async () => {
    const andreas = await threadListe(u('andreas'), { postfach: 'mein', ordner: 'eingang' });
    const julia = await threadListe(u('julia'), { postfach: 'alle', ordner: 'eingang' });
    const nurAndreas = await withSystem((tx) => tx.execute<{ thread_key: string }>(sql`
      SELECT thread_key FROM entries WHERE kind = 'mail' AND visibility = 'restricted' AND visible_to = ARRAY[${u('andreas')}]::uuid[]`));
    const privat = new Set(nurAndreas.rows.map((r) => r.thread_key));
    expect(andreas.some((t) => privat.has(t.thread))).toBe(true);
    for (const t of julia) expect(await mailThread(u('julia'), t.thread)).not.toBeNull();
  });

  it('sent = from the mailbox address, regardless of folder names', async () => {
    const g = await threadListe(u('andreas'), { postfach: 'mein', ordner: 'gesendet' });
    for (const t of g) expect(t.von).toMatch(/^an /);
  });

  it("a thread shows other people's mails only as placeholder (E13)", async () => {
    const t = (await threadListe(u('andreas'), { postfach: 'mein', ordner: 'eingang' }))[0]!;
    await createEntry({ kind: 'mail', thread_key: t.thread, visibility: 'restricted', visible_to: [u('julia')], title: 'Geheim', body_text: 'nur Julia', meta: { from: { email: 'x@solaro.example' } } });
    const th = (await mailThread(u('andreas'), t.thread))!;
    expect(th.nachrichten.some((m) => m.text === 'nur Julia')).toBe(false);
    expect(th.platzhalter).toEqual([expect.objectContaining({ owners: ['Julia'] })]);
  });

  it('drafts are listed only for their author', async () => {
    const p = await postfaecher(u('andreas'));
    await runAction({ type: 'user', userId: u('andreas') }, 'mail.draft', { connection_id: p.mein!.id, to: ['lisa@solaro.example'], subject: 'Mein Entwurf', body: 'x' });
    expect((await threadListe(u('andreas'), { postfach: 'mein', ordner: 'entwuerfe' })).map((d) => d.betreff)).toContain('Mein Entwurf');
    expect((await threadListe(u('julia'), { postfach: 'mein', ordner: 'entwuerfe' })).map((d) => d.betreff)).not.toContain('Mein Entwurf');
    const [d] = await withSystem((tx) => tx.select().from(entries).where(eq(entries.title, 'Mein Entwurf')));
    expect(d!.kind).toBe('draft');
  });
});
