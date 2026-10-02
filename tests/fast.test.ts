// The real fast path (§7.2.4, §7.4) with a mock model: what goes into the call, what may
// come back. Uses the imported fixtures.
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem } from '@/lib/db/client';
import { entries, links, matters, modelCalls } from '@/lib/db/schema';
import { assignWithFast } from '@/lib/model/fast';
import { applyAssignment } from '@/lib/pipeline/apply';
import { candidates } from '@/lib/pipeline/candidates';
import { korrekturBeispiele } from '@/lib/pipeline/korrekturen';
import { importFixtures, NOW } from './helpers';

let fx: Awaited<ReturnType<typeof importFixtures>>;
beforeAll(async () => { fx = await importFixtures(); });
afterAll(() => closeDb());

const entryWhere = async (cond: ReturnType<typeof sql>) => (await withSystem((tx) => tx.select().from(entries).where(cond).orderBy(entries.occurred_at)))[0]!;
const answer = (json: unknown) => new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [{ type: 'text', text: JSON.stringify(json) }],
    finishReason: { unified: 'stop', raw: undefined },
    usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
    warnings: [],
  }),
});

describe('correction examples (§7.4)', () => {
  let teamEntry: typeof entries.$inferSelect;
  let andreasEntry: typeof entries.$inferSelect;
  beforeAll(async () => {
    // a correction on a team mail, and one on a mail only Andreas can read
    teamEntry = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visibility} = 'team' AND EXISTS (SELECT 1 FROM links l WHERE l.entry_id = ${entries.id} AND l.target_type = 'matter')`);
    andreasEntry = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visible_to} = ARRAY[${fx.users.andreas}]::uuid[] AND EXISTS (SELECT 1 FROM links l WHERE l.entry_id = ${entries.id})`);
    const linkOf = async (e: typeof entries.$inferSelect) => (await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, e.id))))[0]!;
    await runAction({ type: 'user', userId: fx.users.julia! }, 'entry.unlink', { link_id: (await linkOf(teamEntry)).id });
    await runAction({ type: 'user', userId: fx.users.andreas! }, 'entry.unlink', { link_id: (await linkOf(andreasEntry)).id });
  });

  it('a team entry gets only examples everybody may read', async () => {
    const other = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visibility} = 'team' AND ${entries.id} <> ${teamEntry.id}`);
    const k = await withSystem((tx) => korrekturBeispiele(tx, other));
    expect(k.some((x) => x.includes(teamEntry.title!))).toBe(true);
    expect(k.some((x) => x.includes(andreasEntry.title!))).toBe(false);
  });

  it("Andreas' own entry may learn from his own correction", async () => {
    const other = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visible_to} = ARRAY[${fx.users.andreas}]::uuid[] AND ${entries.id} <> ${andreasEntry.id}`);
    const k = await withSystem((tx) => korrekturBeispiele(tx, other));
    expect(k.some((x) => x.includes(andreasEntry.title!) && x.includes('gehört nicht zu'))).toBe(true);
  });

  it('undone corrections are no examples', async () => {
    const [a] = await withSystem((tx) => tx.execute<{ id: string }>(sql`SELECT id FROM actions WHERE type = 'entry.unlink' AND actor_user_id = ${fx.users.julia!}`)).then((r) => r.rows);
    const { undoAction } = await import('@/lib/actions');
    await undoAction(a!.id, fx.users.julia!);
    const other = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visibility} = 'team' AND ${entries.id} <> ${teamEntry.id}`);
    expect((await withSystem((tx) => korrekturBeispiele(tx, other))).some((x) => x.includes(teamEntry.title!))).toBe(false);
  });
});

describe('assignWithFast with a real (mock) model', () => {
  it('sends candidates and corrections, accepts an answer within them', async () => {
    const e = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visible_to} = ARRAY[${fx.users.andreas}]::uuid[]`);
    const out = await withSystem(async (tx) => {
      const c = await candidates(tx, e, { people: [], orgs: [], matters: [] });
      const model = answer({ relevant: true, confidence: 'high', summary: 'ok', matter: c.matters[0] ? { id: c.matters[0].id } : null, people: [], tasks: [] });
      const r = await assignWithFast(tx, { entry: e, candidates: c }, { model, now: NOW });
      const prompt = JSON.stringify(model.doGenerateCalls[0]!.prompt);
      return { r, prompt, c };
    });
    expect(out.r).toMatchObject({ relevant: true, confidence: 'high' });
    for (const m of out.c.matters) expect(out.prompt).toContain(m.id);
    expect(out.prompt).toContain('Korrekturen des Teams');
  });

  it('rejects an invented ID (schema narrowed to the candidates) and logs the failed call', async () => {
    const e = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visibility} = 'team'`);
    const invented = crypto.randomUUID();
    const p = withSystem(async (tx) => assignWithFast(tx, { entry: e, candidates: await candidates(tx, e, { people: [], orgs: [], matters: [] }) }, {
      model: answer({ relevant: true, confidence: 'high', summary: 'x', matter: { id: invented }, people: [], tasks: [] }), now: NOW,
    }));
    await expect(p).rejects.toThrow();
    const failed = await withSystem((tx) => tx.select().from(modelCalls).where(and(eq(modelCalls.role, 'fast'), sql`${modelCalls.error} IS NOT NULL`)));
    expect(failed.length).toBeGreaterThan(0);
  });

  it('apply drops IDs that do not exist instead of linking into nothing', async () => {
    const e = await entryWhere(sql`${entries.kind} = 'mail' AND ${entries.visibility} = 'team'`);
    const ghost = crypto.randomUUID();
    const report = await withSystem((tx) => applyAssignment(tx, e, { people: [], orgs: [], matters: [] }, { matters: [], people: [], orgs: [] },
      { relevant: true, confidence: 'high', summary: 'x', matter: { id: ghost }, people: [{ id: ghost }], org: { id: ghost }, tasks: [] }));
    expect(report.unknown).toEqual([ghost, ghost, ghost]);
    expect(await withSystem((tx) => tx.select().from(links).where(eq(links.target_id, ghost)))).toHaveLength(0);
    expect(await withSystem((tx) => tx.select().from(matters).where(eq(matters.id, ghost)))).toHaveLength(0);
  });
});
