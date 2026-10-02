// Stage-3 acceptance (§13) with the real model behind MODEL_THINK – the check the
// deterministic "skript" cannot give: does the model choose the right tools, IDs and dates?
// The checks accept any wording; they look at the record and at the sources.
// Run: `npm run eval:chat` (needs MISTRAL_API_KEY or the key of the configured provider).
import { and, eq, sql } from 'drizzle-orm';
import type { UIMessage } from 'ai';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { actions, entries, orgs, tasks } from '@/lib/db/schema';
import { chatAntwort, ladeChat } from '@/lib/model/chat';
import type { Karte } from '@/lib/model/werkzeuge/karten';
import { importFixtures, NOW } from '../tests/helpers';

const spec = process.env.MODEL_THINK ?? '';
if (!spec || spec === 'skript') throw new Error('eval:chat braucht ein echtes Modell in MODEL_THINK (.env), z. B. mistral:mistral-medium-3.5');

let fx: Awaited<ReturnType<typeof importFixtures>>;
let solaro: string;
beforeAll(async () => {
  fx = await importFixtures();
  solaro = (await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Solaro'))))[0]!.id;
});
afterAll(() => closeDb());

const user = (key: string) => fx.users[key]!;

async function frage(key: string, text: string) {
  const { result } = await runAction<{ id: string }>({ type: 'user', userId: user(key) }, 'chat.create', { title: text.slice(0, 60) });
  const t0 = Date.now();
  const { stream, fertig } = await chatAntwort({
    userId: user(key), chatId: result.id, now: NOW,
    message: { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] },
  });
  const reader = stream.getReader();
  while (!(await reader.read()).done) { /* drain */ }
  await fertig;
  const answer = (await ladeChat(user(key), result.id))!.messages.at(-1)!;
  console.log(`\n[${spec}] ${text}\n→ ${((Date.now() - t0) / 1000).toFixed(1)} s, Werkzeuge: ${werkzeuge(answer).join(', ') || '–'}\n${antwort(answer)}`);
  return { chatId: result.id, answer };
}

type ToolPart = { type: string; state: string; output?: Record<string, unknown> };
const toolParts = (m: UIMessage) => m.parts.filter((p) => p.type.startsWith('tool-')) as unknown as ToolPart[];
const werkzeuge = (m: UIMessage) => toolParts(m).map((p) => `${p.type.slice(5)}${p.output?.ok === false ? ' (Fehler)' : ''}`);
const karten = (m: UIMessage) => toolParts(m).map((p) => p.output?.karte as Karte | undefined).filter((k): k is Karte => !!k);
const antwort = (m: UIMessage) => m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');

describe(`Abnahme Stufe 3 mit ${spec}`, () => {
  it('„Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber“', async () => {
    const { chatId, answer } = await frage('andreas', 'Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber');

    const notes = await withSystem((tx) => tx.execute<{ id: string; meta: { conversation?: { art: string } } }>(sql`
      SELECT e.id, e.meta FROM entries e JOIN links l ON l.entry_id = e.id
      WHERE e.kind = 'note' AND e.author_user_id = ${user('andreas')} AND l.target_type = 'org' AND l.target_id = ${solaro}`));
    expect.soft(notes.rows.length, 'eine Notiz bei Solaro').toBe(1);
    expect.soft(notes.rows[0]?.meta.conversation?.art, 'als Gespräch „Beratung“').toBe('Beratung');

    const neu = await withSystem((tx) => tx.select().from(tasks).where(sql`${tasks.action_id} IN (SELECT id FROM actions WHERE chat_id = ${chatId})`));
    const theirs = neu.filter((t) => t.direction === 'theirs' && /pitch/i.test(t.title));
    const ours = neu.filter((t) => t.direction === 'ours' && /weber/i.test(t.title));
    expect.soft(theirs.length, 'Zusage „Pitchdeck“ (theirs)').toBe(1);
    // NOW is Thursday 01.10.2026 → Friday 02.10., end of day in Berlin
    expect.soft(theirs[0]?.due_at?.toISOString(), 'fällig Freitag 02.10.').toBe('2026-10-02T21:59:59.000Z');
    expect.soft(theirs[0]?.org_id ?? theirs[0]?.owner_person_id, 'von Solaro (Organisation oder Person)').toBeTruthy();
    expect.soft(ours.length, 'Aufgabe „Frau Weber …“ (ours)').toBe(1);
    expect.soft(ours[0]?.owner_user_id, 'für Andreas').toBe(user('andreas'));
    expect.soft(neu.length, 'keine weiteren Aufgaben').toBe(2);
    if (notes.rows[0]) expect.soft(neu.every((t) => t.source_entry_id === notes.rows[0]!.id), 'aus der Notiz abgeleitet').toBe(true);

    const acts = await withSystem((tx) => tx.select().from(actions).where(eq(actions.chat_id, chatId)));
    expect.soft(acts.every((a) => a.actor_type === 'model'), 'alles als Akteur model').toBe(true);
    expect.soft(karten(answer).length, 'eine Karte je Schritt').toBe(acts.length);
    expect.soft(karten(answer).every((k) => k.undoable), 'jede Karte mit Rückgängig').toBe(true);
    expect.soft(werkzeuge(answer).filter((w) => w.endsWith('(Fehler)')), 'keine fehlerhaften Werkzeugaufrufe').toEqual([]);
  });

  it('„Was haben wir Solaro versprochen?“ – mit Quellen, keine erfundenen', async () => {
    const { chatId, answer } = await frage('andreas', 'Was haben wir Solaro versprochen?');
    const text = antwort(answer);
    expect.soft(text, 'nennt die IHK-Zusage').toMatch(/IHK/);
    expect.soft(text, 'nennt das Feedback zum Finanzplan').toMatch(/Finanzplan/);
    const cited = [...text.matchAll(/\[\[([0-9a-f-]{36})\]\]/g)].map((m) => m[1]!);
    const quellen = new Set(toolParts(answer).flatMap((p) => ((p.output?.quellen as { id: string }[] | undefined) ?? []).map((q) => q.id)));
    expect.soft(cited.length, 'zitiert Quellen').toBeGreaterThanOrEqual(2);
    expect.soft(cited.filter((id) => !quellen.has(id)), 'keine erfundenen Quellen').toEqual([]);
    const geaendert = await withSystem((tx) => tx.select().from(actions).where(eq(actions.chat_id, chatId)));
    expect.soft(geaendert.map((a) => a.type), 'eine Frage ändert nichts').toEqual([]);
  });

  it('„Ab jetzt: Social-Media-Hinweise für mich nur montags.“ – persönliche Anweisung', async () => {
    await frage('mehmet', 'Ab jetzt: Social-Media-Hinweise für mich nur montags.');
    const rows = await withSystem((tx) => tx.select().from(entries).where(and(eq(entries.kind, 'instruction'), eq(entries.author_user_id, user('mehmet')))));
    expect.soft(rows.length, 'eine Anweisung').toBe(1);
    expect.soft(rows[0]?.instruction_user_id, 'persönlich').toBe(user('mehmet'));
    expect.soft(rows[0]?.body_text, 'Inhalt').toMatch(/montag/i);
  });
});
