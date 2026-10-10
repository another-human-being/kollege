// Kontakte (10.10.2026): organisation from domain or name, the web search with its guards
// (simulated Mistral answer), what a contact rests on (with the reader's rights), list columns.
import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem, withUser } from '@/lib/db/client';
import { orgs, people } from '@/lib/db/schema';
import { orgFuer } from '@/lib/kontakte/organisation';
import { anreichernLauf, auswerten } from '@/lib/kontakte/websuche';
import { belegeZu } from '@/lib/views/belege';
import { contactList, personDetail } from '@/lib/views/contacts';
import { importFixtures, NOW } from './helpers';

const SYSTEM = { type: 'system' } as const;
const neuePerson = async (name: string, email: string) =>
  (await runAction<{ id: string }>(SYSTEM, 'person.create', { name, emails: [{ email, source: 'mail' }] })).result.id;
const person = async (id: string) => (await withSystem((tx) => tx.select().from(people).where(eq(people.id, id))))[0]!;

/** a Mistral Conversations answer with web_search: text with the JSON, and the pages it found */
const antwort = (json: object, urls: string[]) => ({
  outputs: [
    { type: 'tool.execution', name: 'web_search' },
    { type: 'message.output', content: [
      { type: 'text', text: `Gefunden.\n${JSON.stringify(json)}` },
      ...urls.map((url) => ({ type: 'tool_reference', tool: 'web_search', url, title: `Seite ${url}` })),
    ] },
  ],
  usage: { prompt_tokens: 50, completion_tokens: 20 },
});

describe('Kontakte (10.10.)', () => {
  let fx: Awaited<ReturnType<typeof importFixtures>>;
  beforeAll(async () => { fx = await importFixtures(); }, 60_000);
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  afterAll(() => closeDb());

  it('organisation: the domain first, then the name, else a new unreviewed one – never freemail', async () => {
    const [solaro] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Solaro')));
    await withSystem(async (tx) => {
      expect(await orgFuer(tx, { email: 'neu@solaro.example', name: 'Irgendwas' })).toBe(solaro!.id);
      expect(await orgFuer(tx, { email: 'x@gmail.example', name: 'solaro' })).toBe(solaro!.id);
      expect(await orgFuer(tx, { email: 'x@gmail.example' })).toBeUndefined();
      const neu = await orgFuer(tx, { email: 'l.wolf@hnu.example', name: 'Hochschule Neu-Ulm', rolle: 'university' });
      const [o] = await tx.select().from(orgs).where(eq(orgs.id, neu!));
      expect(o).toMatchObject({ name: 'Hochschule Neu-Ulm', role: 'university', domains: ['hnu.example'], review_state: 'unreviewed' });
      // the next person of that domain lands there without a name
      expect(await orgFuer(tx, { email: 'b.berg@hnu.example' })).toBe(neu);
    });
  });

  it('web search guards: no clear match, or a source the search did not return – nothing is set', () => {
    const urls = ['https://www.hnu.example/gruendungszentrum/team'];
    expect(auswerten({ text: JSON.stringify({ passt: true, organisation: 'HNU', art: 'university', funktion: 'Referentin', quellen: urls }), quellen: urls.map((url) => ({ url, titel: null })) }))
      .toMatchObject({ status: 'gefunden', organisation: 'HNU', funktion: 'Referentin' });
    expect(auswerten({ text: JSON.stringify({ passt: false, organisation: 'HNU', art: null, funktion: null, quellen: urls }), quellen: urls.map((url) => ({ url, titel: null })) }).status).toBe('unklar');
    expect(auswerten({ text: JSON.stringify({ passt: true, organisation: 'HNU', art: null, funktion: null, quellen: ['https://erfunden.example/x'] }), quellen: urls.map((url) => ({ url, titel: null })) }).status).toBe('unklar');
    expect(auswerten({ text: 'kein JSON', quellen: [] }).status).toBe('unklar');
  });

  it('web search off by default: nothing leaves the house', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await anreichernLauf()).toEqual({ gesucht: 0, gefunden: 0, unklar: 0, fehler: 0 });
    expect(f).not.toHaveBeenCalled();
  });

  it('web search on: organisation and kind as a guess with sources; only name and domain are sent', async () => {
    vi.stubEnv('WEBSUCHE', 'an');
    vi.stubEnv('MISTRAL_API_KEY', 'test');
    vi.stubEnv('MODEL_THINK', 'mistral:mistral-medium-3.5');
    const lada = await neuePerson('Lada Sandhag-Wolf', 'lada.sandhag-wolf@hs-neu-ulm.example');
    const anfragen: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      anfragen.push({ url, body });
      const passt = String(body.inputs).includes('Lada');
      return new Response(JSON.stringify(passt
        ? antwort({ passt: true, organisation: 'Gründungszentrum der Hochschule Neu-Ulm', art: 'university', funktion: 'Gründungsberaterin', quellen: ['https://www.hs-neu-ulm.example/gruendung/team'] }, ['https://www.hs-neu-ulm.example/gruendung/team'])
        : antwort({ passt: false, organisation: null, art: null, funktion: null, quellen: [] }, [])), { status: 200 });
    });
    const r = await anreichernLauf({ personId: lada });
    expect(r).toMatchObject({ gesucht: 1, gefunden: 1 });
    const a = anfragen[0]!;
    expect(a.url).toBe('https://api.eu.mistral.ai/v1/conversations');
    expect(a.body).toMatchObject({ model: 'mistral-medium-3.5', tools: [{ type: 'web_search' }], store: false });
    expect(a.body.inputs).toBe('Person: Lada Sandhag-Wolf\nMail-Domain: hs-neu-ulm.example');

    const p = await person(lada);
    expect(p.role).toBe('university');
    expect(p.web).toMatchObject({ status: 'gefunden', funktion: 'Gründungsberaterin', quellen: [{ url: 'https://www.hs-neu-ulm.example/gruendung/team' }] });
    const [o] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.id, p.org_id!)));
    expect(o).toMatchObject({ name: 'Gründungszentrum der Hochschule Neu-Ulm', role: 'university', domains: ['hs-neu-ulm.example'], review_state: 'unreviewed' });
    // once: the next run does not search again
    expect((await anreichernLauf({ personId: lada })).gesucht).toBe(0);
  });

  it('web search: an organisation a person set stays; a failed search is tried again a day later', async () => {
    vi.stubEnv('WEBSUCHE', 'an');
    vi.stubEnv('MISTRAL_API_KEY', 'test');
    vi.stubEnv('MODEL_THINK', 'mistral:mistral-medium-3.5');
    const [solaro] = await withSystem((tx) => tx.select().from(orgs).where(eq(orgs.name, 'Solaro')));
    const id = await neuePerson('Nina Neumann', 'nina@freemail-x.example');
    await runAction({ type: 'user', userId: fx.users.andreas! }, 'person.update', { id, org_id: solaro!.id });
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(antwort({ passt: true, organisation: 'Andere GmbH', art: 'partner', funktion: 'CEO', quellen: ['https://andere.example'] }, ['https://andere.example'])), { status: 200 }));
    await anreichernLauf({ personId: id });
    expect((await person(id)).org_id).toBe(solaro!.id);

    const id2 = await neuePerson('Otto Offline', 'otto@offline.example');
    vi.stubGlobal('fetch', async () => new Response('Service Unavailable', { status: 503 }));
    expect((await anreichernLauf({ personId: id2 })).fehler).toBe(1);
    expect((await person(id2)).web).toMatchObject({ status: 'fehler' });
    expect((await anreichernLauf({ personId: id2 })).gesucht).toBe(0);
    await withSystem((tx) => tx.execute(sql`UPDATE people SET web = jsonb_set(web, '{am}', to_jsonb((now() - interval '2 days')::text)) WHERE id = ${id2}`));
    expect((await anreichernLauf({ personId: id2 })).gesucht).toBe(1);
  });

  it('what a contact rests on: the entries that mention them – private mail of others stays out (RLS)', async () => {
    const [lisa] = await withSystem((tx) => tx.select().from(people).where(eq(people.name, 'Lisa Meier')));
    const alle = await withSystem((tx) => belegeZu(tx, 'person', lisa!.id));
    const andreas = await withUser(fx.users.andreas!, (tx) => belegeZu(tx, 'person', lisa!.id));
    expect(alle.length).toBeGreaterThan(0);
    expect(andreas.length).toBeLessThanOrEqual(alle.length);
    const sichtbar = await withUser(fx.users.andreas!, async (tx) => (await tx.execute<{ id: string }>(sql`SELECT id FROM entries`)).rows.map((r) => r.id));
    for (const b of andreas) expect(sichtbar).toContain(b.id);
    expect((await personDetail(fx.users.andreas!, lisa!.id, NOW))!.belege).toEqual(andreas);
  });

  it('list: organisation and kind as their own columns', async () => {
    const { rows } = await contactList(fx.users.andreas!);
    expect(rows.find((r) => r.name === 'Lisa Meier')).toMatchObject({ type: 'person', org: 'Solaro' });
    expect(rows.find((r) => r.name === 'Lada Sandhag-Wolf')).toMatchObject({ org: 'Gründungszentrum der Hochschule Neu-Ulm', rolle: 'university' });
    expect(rows.find((r) => r.name === 'Solaro')).toMatchObject({ type: 'org', org: null, rolle: 'founding_team' });
  });
});
