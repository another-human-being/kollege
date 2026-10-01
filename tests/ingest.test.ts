// Intake robustness (§7.1, §12): idempotent sync, broken elements, import window, threads.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, entries } from '@/lib/db/schema';
import { seed } from '@/lib/db/seed';
import { syncConnection } from '@/lib/pipeline/ingest';
import { NOW, resetDb } from './helpers';

let s: Awaited<ReturnType<typeof seed>>;
beforeAll(async () => {
  await resetDb();
  s = await seed({ now: NOW });
});
afterAll(() => closeDb());

const entryCount = async () => (await withSystem((tx) => tx.select({ n: count() }).from(entries)))[0]!.n;

describe('sync', () => {
  it('stores raw, marks the first sync as import and is idempotent', async () => {
    for (const id of s.connections) await syncConnection(id, { now: NOW });
    const n = await entryCount();
    expect(n).toBe(15 + 7 + 6);
    const pending = await withSystem((tx) => tx.select().from(entries).where(eq(entries.processing_state, 'pending')));
    expect(pending).toHaveLength(n);
    // everything that already happened is historical; future events are not
    const future = pending.filter((e) => !e.historical).map((e) => (e.meta as { fixture_key: string }).fixture_key).sort();
    expect(future).toEqual(['e4', 'e5', 'e6']);
    expect(pending.every((e) => e.blob_path && /^[0-9a-f]{64}$/.test(e.blob_path))).toBe(true);

    // second sync with cursor: nothing new
    for (const id of s.connections) {
      const r = await syncConnection(id, { now: NOW });
      expect(r.newEntryIds).toEqual([]);
      expect(r.isImport).toBe(false);
    }
    // even without cursor (re-import): upsert by dedupe_key, no duplicates, visibility unchanged
    const before = await withSystem((tx) => tx.select().from(entries).orderBy(entries.dedupe_key));
    await withSystem((tx) => tx.update(connections).set({ cursor: null }));
    for (const id of s.connections) await syncConnection(id, { now: NOW });
    const after = await withSystem((tx) => tx.select().from(entries).orderBy(entries.dedupe_key));
    expect(after.map((e) => [e.dedupe_key, e.visibility, e.visible_to])).toEqual(
      before.map((e) => [e.dedupe_key, e.visibility, e.visible_to]),
    );
  });

  it('a mail known from another mailbox only widens visible_to', async () => {
    const m09 = (await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' = 'm09'`)))[0]!;
    expect([...m09.visible_to].sort()).toEqual([s.users.andreas, s.users.julia].sort());
    // m02 is in Andreas' and in the StartHub mailbox → team
    const m02 = (await withSystem((tx) => tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' = 'm02'`)))[0]!;
    expect(m02.visibility).toBe('team');
  });

  it('an event is visible to the calendar owner and invited team members', async () => {
    const rows = await withSystem((tx) =>
      tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' IN ('e1', 'e5')`),
    );
    const viewers = (k: string) =>
      [...rows.find((r) => (r.meta as { fixture_key: string }).fixture_key === k)!.visible_to].sort();
    // e5: Julia's calendar, Andreas and Mehmet invited
    expect(viewers('e5')).toEqual([s.users.andreas, s.users.julia, s.users.mehmet].sort());
    // e1: Andreas' calendar, only external guests
    expect(viewers('e1')).toEqual([s.users.andreas]);
  });

  it('threads replies onto the first mail', async () => {
    const rows = await withSystem((tx) =>
      tx.select().from(entries).where(sql`${entries.meta}->>'fixture_key' IN ('m01', 'm02', 'm03', 'm04')`),
    );
    const key = (k: string) => rows.find((r) => (r.meta as { fixture_key: string }).fixture_key === k)!.thread_key;
    expect(key('m02')).toBe(key('m01'));
    expect(key('m04')).toBe(key('m03'));
    expect(key('m01')).not.toBe(key('m03'));
  });

  it('a broken element never blocks the sync: logged as entry, cursor moves on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kollege-fx-'));
    const ok = { key: 'x1', message_id: '<x1@extern.example>', mailboxes: ['andreas'], date: '2026-09-30T10:00:00+02:00',
      from: { name: 'Extern', email: 'a@extern.example' }, to: [{ email: 'andreas@gruendung.uni-augsburg.example' }],
      subject: 'Hallo', body: 'Text' };
    const noId = { ...ok, key: 'x2', message_id: undefined };
    const badDate = { ...ok, key: 'x3', message_id: '<x3@extern.example>', date: '30.09.2026' };
    const old = { ...ok, key: 'x4', message_id: '<x4@extern.example>', date: '2024-01-01T10:00:00+01:00' };
    writeFileSync(join(dir, 'mail.json'), JSON.stringify([noId, ok, badDate, old]));
    const [conn] = await withSystem((tx) =>
      tx.insert(connections).values({
        user_id: s.users.andreas, kind: 'mail', provider: 'fixture', label: 'Testpostfach',
        config: { source: 'mail', mailbox: 'andreas', dir }, import_since: '2025-10-01',
      }).returning(),
    );

    const r = await syncConnection(conn!.id, { now: NOW });
    expect(r.newEntryIds).toHaveLength(1); // x1; x4 is older than import_since
    expect(r.errors.map((e) => e.ref)).toEqual(['x2', 'x3']);
    const errs = await withSystem((tx) => tx.select().from(entries).where(eq(entries.kind, 'system')));
    expect(errs.map((e) => e.title).sort()).toEqual([
      'Element x2 aus „Testpostfach“ nicht lesbar',
      'Element x3 aus „Testpostfach“ nicht lesbar',
    ]);
    expect(errs.every((e) => e.visibility === 'restricted' && e.visible_to[0] === s.users.andreas)).toBe(true);
    const [after] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, conn!.id)));
    expect(after).toMatchObject({ status: 'ok', last_error: '2 Elemente nicht lesbar', cursor: { keys: ['x2', 'x1', 'x3', 'x4'] } });
  });
});
