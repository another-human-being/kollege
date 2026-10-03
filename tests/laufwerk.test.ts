// Acceptance stage 7 (§13) against a real folder standing in for the mounted SMB share:
// a file in "Events/Gründungsnacht 2026" ends up with the event. Plus change detection,
// versions without duplicate tasks, deletion, and the guards of decision 37.
import { mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { MockLanguageModelV4 } from 'ai/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BATCH } from '@/lib/connectors/laufwerk';
import { laufwerkVerbinden } from '@/lib/connectors/laufwerk-einrichten';
import { closeDb, withSystem } from '@/lib/db/client';
import { connections, entries, links, tasks } from '@/lib/db/schema';
import { syncConnection } from '@/lib/pipeline/ingest';
import { processEntry } from '@/lib/pipeline/process';
import { getBlob } from '@/lib/pipeline/blobs';
import { datei as dateiDetail, dateiListe, ordnerBaum } from '@/lib/views/dateien';
import { importFixtures, NOW } from './helpers';

/** fast stand-in: plain answer, one task per "Aufgabe: …" line, quoted verbatim */
const fast = () => new MockLanguageModelV4({
  doGenerate: async (opts) => {
    const prompt = JSON.stringify(opts.prompt).replace(/\\n/g, '\n');
    const aufgaben = [...prompt.matchAll(/Aufgabe: ([^\n"\\]+)/g)].map((m) => m[1]!);
    const answer = {
      relevant: true, confidence: 'high', summary: 'Datei vom Laufwerk.', matter: null, people: [],
      tasks: aufgaben.map((a) => ({ title: a, direction: 'ours', owner_hint: null, due: null, quote: `Aufgabe: ${a}` })),
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(answer) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: { inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 20, text: 20, reasoning: undefined } },
      warnings: [],
    };
  },
});

describe('Stufe 7: Laufwerk', () => {
  let root: string;
  let connId: string;
  let gn2026: string;
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  const datei = (p: string) => join(root, p);
  const schreib = async (p: string, text: string, mtime = new Date('2026-09-30T10:00:00Z')) => {
    await mkdir(join(root, p, '..'), { recursive: true });
    await writeFile(datei(p), text);
    await utimes(datei(p), mtime, mtime);
  };
  const sync = async () => {
    const s = await syncConnection(connId, { now: NOW });
    for (const id of s.newEntryIds) await processEntry(id, { model: fast(), now: NOW });
    return s;
  };
  const versionen = (p: string) => withSystem((tx) => tx.select().from(entries)
    .where(and(eq(entries.connection_id, connId), eq(entries.external_id, p))).orderBy(entries.occurred_at));

  beforeAll(async () => {
    fx = await importFixtures();
    root = await mkdtemp(join(tmpdir(), 'kollege-laufwerk-'));
    const [f3] = await withSystem((tx) => tx.select({ id: entries.id }).from(entries)
      .where(sql`${entries.meta}->>'path' = 'Events/Gründungsnacht 2026/Ablaufplan.docx'`));
    const [l] = await withSystem((tx) => tx.select().from(links).where(and(eq(links.entry_id, f3!.id), eq(links.target_type, 'matter'))));
    gn2026 = l!.target_id;

    await schreib('Events/Gründungsnacht 2026/Catering-Angebot.txt', 'Angebot Catering für 60 Personen, 18–23 Uhr.\nAufgabe: Catering bis 10.11. bestätigen');
    await schreib('Events/Gründungsnacht 2026/~$Catering-Angebot.txt', 'Sperrdatei von Word');
    await schreib('Events/Gründungsnacht 2026/.DS_Store', 'x');
    await schreib('Archiv/Uralt.txt', 'aus 2023', new Date('2023-05-01T10:00:00Z'));
    await mkdir(join(root, 'Verknüpft'));
    await symlink('/etc', join(root, 'Verknüpft', 'etc'));
    ({ id: connId } = await laufwerkVerbinden({ root, importSince: '2025-10-01' }));
    await sync();
  }, 60_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
    await closeDb();
  });

  it('a file in the event folder ends up with the event (acceptance)', async () => {
    const [e] = await versionen('Events/Gründungsnacht 2026/Catering-Angebot.txt');
    expect(e).toMatchObject({ kind: 'file', visibility: 'team', processing_state: 'done', title: 'Catering-Angebot.txt' });
    expect(e!.body_text).toContain('60 Personen');
    expect((await getBlob(e!.blob_path!)).toString('utf8')).toContain('Catering');
    const l = await withSystem((tx) => tx.select().from(links).where(eq(links.entry_id, e!.id)));
    expect(l).toEqual(expect.arrayContaining([expect.objectContaining({ target_type: 'matter', target_id: gn2026, origin: 'rule' })]));
    const t = await withSystem((tx) => tx.select().from(tasks).where(eq(tasks.source_entry_id, e!.id)));
    expect(t.map((x) => x.title)).toEqual(['Catering bis 10.11. bestätigen']);
  });

  it('leaves out lock files, hidden files, links and files older than the import limit', async () => {
    const alle = await withSystem((tx) => tx.select({ p: entries.external_id }).from(entries).where(eq(entries.connection_id, connId)));
    expect(alle.map((x) => x.p)).toEqual(['Events/Gründungsnacht 2026/Catering-Angebot.txt']);
  });

  it('an unchanged or only touched file is not read again', async () => {
    expect((await sync()).newEntryIds).toEqual([]);
    const spaeter = new Date('2026-10-01T09:00:00Z');
    await utimes(datei('Events/Gründungsnacht 2026/Catering-Angebot.txt'), spaeter, spaeter);
    expect((await sync()).newEntryIds).toEqual([]);
  });

  it('an edited file is a new version; what it said before does not become a task again', async () => {
    await schreib('Events/Gründungsnacht 2026/Catering-Angebot.txt',
      'Angebot Catering für 70 Personen, 18–23 Uhr.\nAufgabe: Catering bis 10.11. bestätigen\nAufgabe: Vegetarische Optionen anfragen', new Date('2026-10-02T10:00:00Z'));
    expect((await sync()).newEntryIds).toHaveLength(1);
    const [v1, v2] = await versionen('Events/Gründungsnacht 2026/Catering-Angebot.txt');
    expect(v2!.body_text).toContain('70 Personen');
    const t = await withSystem((tx) => tx.select({ title: tasks.title }).from(tasks).where(sql`${tasks.source_entry_id} IN (${v1!.id}, ${v2!.id})`));
    expect(t.map((x) => x.title).sort()).toEqual(['Catering bis 10.11. bestätigen', 'Vegetarische Optionen anfragen']);
  });

  it('the file view shows the newest version, with its earlier ones', async () => {
    const l = await dateiListe(fx.users.julia!, { ordner: 'Events/Gründungsnacht 2026' });
    expect(l.map((f) => f.name).sort()).toEqual(['Ablaufplan.docx', 'Catering-Angebot.txt']);
    const c = l.find((f) => f.name === 'Catering-Angebot.txt')!;
    const d = (await dateiDetail(fx.users.julia!, c.id))!;
    expect(d.text).toContain('70 Personen');
    expect(d.versionen).toHaveLength(2);
    expect(d).toMatchObject({ sichtbar: 'für das Team', herunterladbar: true, bezuege: [expect.objectContaining({ type: 'matter', id: gn2026, origin: 'rule' })] });
    const baum = await ordnerBaum(fx.users.julia!);
    expect(baum.ordner).toEqual(expect.arrayContaining([{ pfad: 'Events/Gründungsnacht 2026', name: 'Gründungsnacht 2026', tiefe: 1, anzahl: 2 }]));
    expect((await dateiListe(fx.users.julia!, { q: 'Catering' })).map((f) => f.name)).toContain('Catering-Angebot.txt');
  });

  it('attachments of a personal mailbox only for its owner (RLS)', async () => {
    const name = 'Finanzplan_Solaro_v2.xlsx';
    expect((await dateiListe(fx.users.andreas!, { ordner: 'mail' })).map((f) => f.name)).toContain(name);
    expect((await dateiListe(fx.users.julia!, { ordner: 'mail' })).map((f) => f.name)).not.toContain(name);
    const [a] = await dateiListe(fx.users.andreas!, { q: 'Finanzplan_Solaro_v2' });
    expect(await dateiDetail(fx.users.julia!, a!.id)).toBeNull();
    expect((await dateiDetail(fx.users.andreas!, a!.id))!.sichtbar).toBe('nur für dich');
  });

  it('a deleted file is marked, its versions stay; restored it is current again', async () => {
    const p = 'Events/Gründungsnacht 2026/Catering-Angebot.txt';
    const inhalt = 'Angebot Catering für 70 Personen, 18–23 Uhr.\nAufgabe: Catering bis 10.11. bestätigen\nAufgabe: Vegetarische Optionen anfragen';
    await rm(datei(p));
    await schreib('Events/Gründungsnacht 2026/Notiz.txt', 'Bleibt da.');
    await sync();
    expect((await versionen(p)).every((v) => (v.meta as { geloescht?: boolean }).geloescht)).toBe(true);
    await schreib(p, inhalt, new Date('2026-10-03T10:00:00Z'));
    expect((await sync()).newEntryIds).toEqual([]);
    const v = await versionen(p);
    expect(v.at(-1)!.body_text).toContain('70 Personen');
    expect((v.at(-1)!.meta as { geloescht?: boolean }).geloescht).toBeUndefined();
    expect(v.at(-1)!.occurred_at.toISOString()).toBe('2026-10-03T10:00:00.000Z');
    // while it was gone, it was not in the list
  });

  it('an empty or missing mount is an error, nothing is deleted', async () => {
    const weg = `${root}-weg`;
    await withSystem((tx) => tx.update(connections).set({ config: { root: weg } }).where(eq(connections.id, connId)));
    await expect(syncConnection(connId, { now: NOW })).rejects.toThrow(/nicht erreichbar/);
    await mkdir(weg);
    await withSystem((tx) => tx.update(connections).set({ status: 'ok' }).where(eq(connections.id, connId)));
    await expect(syncConnection(connId, { now: NOW })).rejects.toThrow(/leer/);
    const [c] = await withSystem((tx) => tx.select().from(connections).where(eq(connections.id, connId)));
    expect(c!.status).toBe('error');
    const geloescht = await withSystem((tx) => tx.select().from(entries)
      .where(sql`${entries.connection_id} = ${connId} AND ${entries.external_id} = 'Events/Gründungsnacht 2026/Notiz.txt' AND ${entries.meta} ? 'geloescht'`));
    expect(geloescht).toEqual([]);
    await rm(weg, { recursive: true });
    await withSystem((tx) => tx.update(connections).set({ config: { root }, status: 'ok' }).where(eq(connections.id, connId)));
  });

  it('a large folder arrives in batches', async () => {
    for (let i = 0; i < BATCH + 5; i++) await schreib(`Viele/Datei-${String(i).padStart(3, '0')}.txt`, `Inhalt ${i}`);
    const s = await syncConnection(connId, { now: NOW });
    expect(s.newEntryIds).toHaveLength(BATCH + 5);
  });
});
