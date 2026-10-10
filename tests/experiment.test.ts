// Experiment "Gespräch als Zustand": runs on the fixtures with a simulated model, changes nothing.
import { sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, withSystem } from '@/lib/db/client';
import { bericht, gespraechDurchgehen, verlaeufe } from '@/lib/experiment/gespraech';
import { importFixtures } from './helpers';

const stand = {
  ball: 'sie', naechster_schritt: 'Solaro schickt das Pitchdeck.', zusammenfassung: 'Erstberatung Solaro.',
  punkte: [{ id: 'p1', art: 'erwartung', text: 'Pitchdeck schicken', wer: 'Solaro', bis: null, status: 'offen', beleg: 'erfunden, steht nirgends', erledigt_beleg: null }],
  aussagen: [],
};
const model = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: 'text', text: JSON.stringify(stand) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 20, text: 20, reasoning: undefined } },
    warnings: [],
  }),
});

describe('Experiment Gespräch als Zustand', () => {
  beforeAll(async () => { await importFixtures(); }, 60_000);
  afterAll(() => closeDb());

  it('goes through the threads with the most tasks, reports both views, writes nothing', async () => {
    const zaehlen = () => withSystem(async (tx) => (await tx.execute<{ n: number }>(sql`SELECT (SELECT count(*) FROM actions) + (SELECT count(*) FROM tasks) AS n`)).rows[0]!.n);
    const vorher = await zaehlen();
    const liste = await verlaeufe({ anzahl: 2 });
    expect(liste.length).toBeGreaterThan(0);
    const schritte = await gespraechDurchgehen(model, liste[0]!.thread_key);
    expect(schritte.length).toBeGreaterThan(0);
    expect(schritte[0]!.belegeFehlen).toEqual(['erfunden, steht nirgends']);
    const text = bericht(liste[0]!, schritte);
    expect(text).toContain('HEUTE (bisherige Verarbeitung)');
    expect(text).toContain('NEU – STAND AM ENDE');
    expect(text).toContain('Zitat(e) nicht gefunden');
    expect(await zaehlen()).toBe(vorher);
  });
});
