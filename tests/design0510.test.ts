// Design 05.10.: the views behind the new sidebar (tree, search) and the new Heute (E55–E57).
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { matters } from '@/lib/db/schema';
import { heute } from '@/lib/views/heute';
import { navigation } from '@/lib/views/nav';
import { schnellsuche } from '@/lib/views/suche';
import { importFixtures, NOW } from './helpers';

describe('Design 05.10.', () => {
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  beforeAll(async () => { fx = await importFixtures(); }, 60_000);
  afterAll(() => closeDb());

  it('search finds what the page shows – and nothing of someone else’s mailbox (RLS)', async () => {
    const a = await schnellsuche(fx.users.andreas!, 'Finanzplan');
    expect(a).toEqual(expect.arrayContaining([expect.objectContaining({ art: 'Mail', titel: 'Finanzplan v2' })]));
    const j = await schnellsuche(fx.users.julia!, 'Finanzplan');
    expect(j.map((t) => t.titel)).not.toContain('Finanzplan v2');
    expect(await schnellsuche(fx.users.julia!, 'x')).toEqual([]);
    const k = await schnellsuche(fx.users.julia!, 'lisa');
    expect(k).toEqual(expect.arrayContaining([expect.objectContaining({ art: 'Kontakt', titel: 'Lisa Meier', href: expect.stringMatching(/^\/p\//) })]));
  });

  it('tree: running, reviewed entries with their open tasks – unreviewed ones not', async () => {
    const vorher = (await navigation(fx.users.julia!)).areas.find((a) => a.key === 'events')!;
    const [pa] = await withSystem((tx) => tx.select().from(matters).where(eq(matters.title, 'Pitch-Abend 19.11.')));
    expect(vorher.eintraege.map((e) => e.titel)).not.toContain('Pitch-Abend 19.11.');
    await runAction({ type: 'user', userId: fx.users.julia! }, 'review.accept', { items: [{ type: 'matter', id: pa!.id }] });
    const nachher = (await navigation(fx.users.julia!)).areas.find((a) => a.key === 'events')!;
    const e = nachher.eintraege.find((x) => x.titel === 'Pitch-Abend 19.11.')!;
    expect(e).toMatchObject({ href: `/b/events?id=${pa!.id}` });
    expect(e.offen).toBeGreaterThan(0);
  });

  it('Heute: the head sentence counts what the lists show; others’ commitments with Wiedervorlage', async () => {
    const h = await heute(fx.users.andreas!, NOW);
    expect(h.kopf.offen).toBe(h.entscheiden.length + h.erledigen.length);
    expect(h.kopf.ausstehend).toBe(h.ausstehend.length);
    expect(h.kopf.ueber).toBe(h.erledigen.filter((p) => p.fArt === 'ue').length);
    // the clarify question is something to decide, the overdue task something to do
    expect(h.entscheiden.map((p) => p.titel)).toContain('Ist „Lisa“ (l.meier@gmx.example) Lisa Meier von Solaro?');
    expect(h.erledigen).toEqual(expect.arrayContaining([expect.objectContaining({ titel: 'Feedback zum Finanzplan an Tom Kraus', kreis: true, fArt: 'ue' })]));
    // a mail waiting for an answer: "… antworten", with the thread to open
    expect(h.erledigen).toEqual(expect.arrayContaining([expect.objectContaining({ titel: 'Tom Kraus antworten', links: [expect.objectContaining({ href: expect.stringMatching(/^\/mail\?t=/) })] })]));
    // the week starts today
    expect(h.woche[0]).toMatchObject({ tag: 'Heute', heute: true });
    for (const p of [...h.ausstehend, ...h.erledigen.filter((x) => x.art === 'nachfassen')]) expect(p.wv).toMatch(/^[A-Z][a-z] \d\d\.\d\d\.$/);
  });
});
