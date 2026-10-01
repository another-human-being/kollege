// Stage 3 (§13): input & chat. The model is the deterministic "skript" stand-in or a mock –
// the tests prove the wiring (tools, rights, cards, undo, sources, storage), not judgement.
import { and, eq, sql } from 'drizzle-orm';
import type { UIMessage } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listActions, runAction, undoAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { actions, chatMessages, entries, links, modelCalls, orgs, tasks } from '@/lib/db/schema';
import { chatAntwort, ladeChat } from '@/lib/model/chat';
import { kontext } from '@/lib/model/kontext';
import { skriptModell } from '@/lib/model/skript';
import { handelnwerkzeuge } from '@/lib/model/werkzeuge/handeln';
import { lesewerkzeuge } from '@/lib/model/werkzeuge/lesen';
import type { Karte } from '@/lib/model/werkzeuge/karten';
import { expectRejects, importFixtures, NOW } from './helpers';

let fx: Awaited<ReturnType<typeof importFixtures>>;
let solaro: string;
beforeAll(async () => {
  fx = await importFixtures();
  solaro = (await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Solaro'))))[0]!.id;
});
afterAll(() => closeDb());

const user = (key: string) => fx.users[key]!;

async function neuerChat(key: string, bezug?: { context_type: 'org'; context_id: string }) {
  const { result } = await runAction<{ id: string }>({ type: 'user', userId: user(key) }, 'chat.create', { title: 'Test', ...bezug });
  return result.id;
}

/** send one message, read the whole stream, wait until the answer is stored */
async function frage(key: string, chatId: string, text: string, model = skriptModell()) {
  const msg: UIMessage = { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] };
  const { stream, fertig } = await chatAntwort({ userId: user(key), chatId, message: msg, now: NOW, model });
  const reader = stream.getReader();
  while (!(await reader.read()).done) { /* drain */ }
  await fertig;
  const chat = await ladeChat(user(key), chatId);
  return chat!.messages.at(-1)!;
}

/** call a tool's execute directly (ToolSet types the input as never) */
const call = (t: { execute?: unknown } | undefined, input: unknown) =>
  (t!.execute as (i: unknown, o: unknown) => Promise<unknown>)(input, { toolCallId: 'x', messages: [] });

type ToolPart = { type: string; state: string; output?: Record<string, unknown> };
const toolParts = (m: UIMessage) => m.parts.filter((p) => p.type.startsWith('tool-')) as unknown as ToolPart[];
const karten = (m: UIMessage) => toolParts(m).map((p) => p.output?.karte as Karte | undefined).filter((k): k is Karte => !!k);
const text = (m: UIMessage) => m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');

describe('acceptance: "Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber"', () => {
  let chatId: string;
  let answer: UIMessage;
  beforeAll(async () => {
    chatId = await neuerChat('andreas');
    answer = await frage('andreas', chatId, 'Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber');
  });

  it('creates a conversation note at Solaro', async () => {
    const notes = await withSystem((tx) => tx.execute<{ id: string; meta: { conversation: { art: string; mit: string } }; author_user_id: string; visibility: string }>(sql`
      SELECT e.id, e.meta, e.author_user_id, e.visibility FROM entries e JOIN links l ON l.entry_id = e.id
      WHERE e.kind = 'note' AND l.target_type = 'org' AND l.target_id = ${solaro}`));
    expect(notes.rows).toHaveLength(1);
    expect(notes.rows[0]).toMatchObject({ author_user_id: user('andreas'), visibility: 'team', meta: { conversation: { art: 'Beratung', mit: 'Solaro' } } });
  });

  it('creates their commitment (theirs) due Friday and our task (ours), both sourced from the note', async () => {
    const note = (await withSystem((tx) => tx.select().from(entries).where(and(eq(entries.kind, 'note'), eq(entries.author_user_id, user('andreas'))))))[0]!;
    const rows = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, note.id)));
    const theirs = rows.find((t) => t.direction === 'theirs')!;
    const ours = rows.find((t) => t.direction === 'ours')!;
    expect(theirs).toMatchObject({ title: 'Pitchdeck', org_id: solaro, owner_user_id: null });
    // NOW is Thursday 01.10.2026 → Friday 02.10., end of day in Berlin
    expect(theirs.due_at?.toISOString()).toBe('2026-10-02T21:59:59.000Z');
    expect(ours).toMatchObject({ title: 'Frau Weber vermitteln', owner_user_id: user('andreas'), org_id: solaro });
  });

  it('acts as actor model on behalf of the user, inside the chat', async () => {
    const rows = await withSystem((tx) => tx.select().from(actions).where(eq(actions.chat_id, chatId)));
    expect(rows.map((a) => a.type).sort()).toEqual(['note.create', 'task.create', 'task.create']);
    expect(rows.every((a) => a.actor_type === 'model' && a.actor_user_id === user('andreas'))).toBe(true);
    expect(rows.find((a) => a.type === 'note.create')?.reason).toContain('Beratung mit Solaro');
  });

  it('answers with one card per step, each with undo and a link', () => {
    const k = karten(answer);
    expect(k).toHaveLength(3);
    expect(k.every((c) => c.undoable && c.link)).toBe(true);
    expect(k.map((c) => c.punkte[0])).toEqual([
      'Beratung mit Solaro notiert bei Solaro',
      'Zusage von Solaro: „Pitchdeck“ bis morgen',
      'Aufgabe für Andreas: „Frau Weber vermitteln“',
    ]);
    expect(k[0]!.link).toEqual({ text: 'Solaro', href: `/o/${solaro}` });
  });

  it('stores both messages; the answer survives a reload', async () => {
    const chat = await ladeChat(user('andreas'), chatId);
    expect(chat!.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(text(chat!.messages[1]!)).toBe('Notiert.');
  });

  it('logs the model call without content', async () => {
    const calls = await withSystem((tx) => tx.select().from(modelCalls).where(eq(modelCalls.user_id, user('andreas'))));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({ role: 'think', model: 'kollege:skript', purpose: 'chat', error: null });
  });

  it('undo on a card removes exactly that step', async () => {
    const k = karten(answer).find((c) => c.punkte[0]!.startsWith('Aufgabe für'))!;
    await undoAction(k.actionId, user('andreas'));
    const left = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Frau Weber vermitteln')));
    expect(left).toHaveLength(0);
    expect(await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.title, 'Pitchdeck')))).toHaveLength(1);
  });

  it('a card names the follow-up steps an undo would also remove', async () => {
    // a note made by hand, then a task as its follow-up step (child action)
    const { actionId: noteAction, result } = await runAction<{ id: string }>({ type: 'user', userId: user('andreas') }, 'note.create', { target_type: 'org', target_id: solaro, body_text: 'x' });
    await runAction({ type: 'user', userId: user('andreas') }, 'task.create', { title: 'y', direction: 'ours', owner_user_id: user('andreas'), source_entry_id: result.id }, { parentActionId: noteAction });
    const { folgenText } = await import('@/lib/model/werkzeuge/karten');
    expect(await withSystem((tx) => folgenText(tx, noteAction))).toBe('entfernt auch 1 Aufgabe');
    await undoAction(noteAction, user('andreas'));
  });
});

describe('acceptance: "Was haben wir Solaro versprochen?"', () => {
  it('answers from the tools, every line with a source the tools returned', async () => {
    const chatId = await neuerChat('andreas');
    const answer = await frage('andreas', chatId, 'Was haben wir Solaro versprochen?');
    const t = text(answer);
    expect(t).toContain('Kontakt zur IHK für Jury/Mentoring prüfen');
    expect(t).toContain('Feedback zum Finanzplan an Tom Kraus');
    const cited = [...t.matchAll(/\[\[([0-9a-f-]{36})\]\]/g)].map((m) => m[1]);
    expect(cited.length).toBeGreaterThanOrEqual(2);
    const quellen = toolParts(answer).flatMap((p) => (p.output?.quellen as { id: string; label: string; href: string | null }[] | undefined) ?? []);
    for (const id of cited) expect(quellen.map((q) => q.id)).toContain(id);
    // the protocol file is the source of the IHK commitment
    expect(quellen.some((q) => q.label === 'Beratungsprotokoll_22-09.docx' && q.href)).toBe(true);
  });
});

describe('instructions by chat', () => {
  it('"Ab jetzt …" stores a personal instruction with an instruction card; it is in the context', async () => {
    const chatId = await neuerChat('mehmet');
    const answer = await frage('mehmet', chatId, 'Ab jetzt: Social-Media-Hinweise für mich nur montags.');
    const [k] = karten(answer);
    expect(k).toMatchObject({ art: 'anweisung', geltung: 'persoenlich', undoable: true });
    const ctx = await kontext(user('mehmet'), NOW);
    expect(ctx.anweisungen).toEqual([expect.objectContaining({ scope: 'personal', text: 'Social-Media-Hinweise für mich nur montags.' })]);
    // personal: invisible to the others, also for their model
    expect((await kontext(user('julia'), NOW)).anweisungen).toEqual([]);
  });

  it('a card names the instruction the model applied', async () => {
    const { result } = await runAction<{ id: string }>({ type: 'user', userId: user('julia') }, 'instruction.create', { body_text: 'Jury-Anfragen immer mit Frist eine Woche.', scope: 'team' });
    const model = new MockLanguageModelV4({
      doStream: [
        stream([{ type: 'tool-call', toolCallId: 'c1', toolName: 'task_create', input: JSON.stringify({ payload: { title: 'Jury anfragen', direction: 'ours', owner_user_id: user('julia'), due_date: '2026-10-08' }, anweisungen: [result.id] }) }], 'tool-calls'),
        stream([{ type: 'text-start', id: 't' }, { type: 'text-delta', id: 't', delta: 'Ok.' }, { type: 'text-end', id: 't' }], 'stop'),
      ],
    });
    const answer = await frage('julia', await neuerChat('julia'), 'Jury anfragen', model);
    expect(karten(answer)[0]).toMatchObject({ anweisung: 'Jury-Anfragen immer mit Frist eine Woche.' });
    const a = (await withSystem((tx) => tx.select().from(actions).where(eq(actions.id, karten(answer)[0]!.actionId))))[0]!;
    expect(a.applied_instruction_ids).toEqual([result.id]);
  });
});

describe('rights and hard rules', () => {
  it('the model gets no external, chat or hint-raising tool', () => {
    const names = Object.keys(handelnwerkzeuge({ userId: user('andreas'), now: NOW }));
    const external = listActions().filter((a) => a.external).map((a) => a.type.replace('.', '_'));
    for (const n of [...external, 'chat_create', 'chat_append', 'chat_update', 'hint_create']) expect(names).not.toContain(n);
    expect(names).toEqual(expect.arrayContaining(['note_create', 'task_create', 'instruction_create', 'matter_create', 'entry_link']));
  });

  it('a failing action returns an error to the model instead of a card', async () => {
    const out = await call(handelnwerkzeuge({ userId: user('julia'), now: NOW }).task_complete, { payload: { id: crypto.randomUUID() } });
    expect(out).toMatchObject({ ok: false });
  });

  it('reading tools see what the user sees: no restricted mail text for others', async () => {
    // Andreas' mail from Tom with the finance plan is restricted to Andreas
    const lesen = (key: string) => lesewerkzeuge({ userId: user(key), now: NOW });
    const a = (await call(lesen('andreas').search, { query: 'Finanzplan' })) as { entries: { id: string }[] };
    const j = (await call(lesen('julia').search, { query: 'Finanzplan' })) as { entries: { id: string }[] };
    const restricted = await withSystem((tx) => tx.select({ id: entries.id }).from(entries).where(and(eq(entries.kind, 'mail'), eq(entries.visibility, 'restricted'), sql`${user('andreas')} = ANY(visible_to)`, sql`NOT ${user('julia')} = ANY(visible_to)`)));
    const ids = new Set(restricted.map((r) => r.id));
    expect(a.entries.some((e) => ids.has(e.id))).toBe(true);
    expect(j.entries.some((e) => ids.has(e.id))).toBe(false);
    // Julia still sees the commitment, with a placeholder instead of the mail as source
    const c = (await call(lesen('julia').get_contact, { type: 'org', id: solaro })) as { commitments: { we_owe: { title: string; source_hidden?: string }[] }; quellen: { id: string }[] };
    const feedback = c.commitments.we_owe.find((t) => t.title.startsWith('Feedback zum Finanzplan'))!;
    expect(feedback.source_hidden).toMatch(/Andreas/);
    expect(c.quellen.some((q) => ids.has(q.id))).toBe(false);
  });

  it('chats are personal: nobody else can read or write them', async () => {
    const chatId = await neuerChat('andreas');
    expect(await ladeChat(user('julia'), chatId)).toBeNull();
    await expectRejects(
      runAction({ type: 'user', userId: user('julia') }, 'chat.append', { chat_id: chatId, role: 'user', content: { id: 'x', parts: [] } }),
      /row-level security|violates/,
    );
    await expectRejects(frage('julia', chatId, 'hallo'), /chat not found/);
    expect(await withSystem((tx) => tx.select().from(chatMessages).where(eq(chatMessages.chat_id, chatId)))).toHaveLength(0);
  });

  it('only the user writes user messages; the model only answers', async () => {
    const chatId = await neuerChat('andreas');
    await expectRejects(
      runAction({ type: 'model', userId: user('andreas') }, 'chat.append', { chat_id: chatId, role: 'user', content: { id: 'x', parts: [] } }),
      /user messages come from the user/,
    );
  });

  it('a chat on a page knows its context', async () => {
    const ctx = await kontext(user('andreas'), NOW, { type: 'org', id: solaro });
    expect(ctx.text).toContain(`Organisation „Solaro“ (type org, ID ${solaro})`);
    expect(ctx.text).toContain('Heute: Donnerstag, 2026-10-01');
  });
});

describe('links stay consistent', () => {
  it('the model chose where the note belongs: its link says origin model', async () => {
    const l = await withSystem((tx) => tx.execute(sql`
      SELECT l.origin FROM links l JOIN entries e ON e.id = l.entry_id
      WHERE e.kind = 'note' AND e.body_text LIKE 'Gerade Beratung%' AND l.target_id = ${solaro}`));
    expect(l.rows).toEqual([{ origin: 'model' }]);
  });
});

type Part = Record<string, unknown>;
function stream(parts: Part[], finish: 'stop' | 'tool-calls') {
  const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
  const all = [...parts, { type: 'finish', usage, finishReason: { unified: finish, raw: undefined } }];
  return { stream: new ReadableStream({ start(c) { for (const p of all) c.enqueue(p); c.close(); } }) } as never;
}
