// Hinweise outside the app (answer of 09.10.2026): push notifications, not mail. One line, the link
// to where the details are; personal hints only; the person's rules; quiet hours; once.
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAction } from '@/lib/actions';
import { closeDb, withSystem, withUser } from '@/lib/db/client';
import { benachrichtigen, nachricht, ruhezeit } from '@/lib/hinweise/push';
import { regelnAnwenden } from '@/lib/hinweise/regeln';
import type { Nachricht } from '@/lib/push/senden';
import { expectRejects, importFixtures, NOW } from './helpers';

const gesendet: { abo: string; n: Nachricht }[] = [];
let antwort: 'ok' | 'weg' | 'fehler' = 'ok';
vi.mock('@/lib/push/senden', async (orig) => ({
  ...(await orig<typeof import('@/lib/push/senden')>()),
  senden: async (abo: string, n: Nachricht) => { gesendet.push({ abo, n }); return antwort; },
}));
const { verschluesseln } = await import('@/lib/push/senden');

process.env.APP_SECRET ??= 'test-app-secret-0123456789abcdef0123';
const user = (id: string) => ({ type: 'user' as const, userId: id });
const abo = (n: number) => ({ endpoint: `https://push.example.org/send/${n}`, keys: { p256dh: `p256dh-${n}`, auth: `auth-${n}` } });
const anmelden = (id: string, n: number) => runAction<{ id: string }>(user(id), 'push.subscribe', { ...verschluesseln(abo(n)), label: `Gerät ${n}` });

describe('Push-Benachrichtigungen', () => {
  let andreas: string;
  let julia: string;

  beforeAll(async () => {
    const fx = await importFixtures();
    andreas = fx.users.andreas!;
    julia = fx.users.julia!;
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BTest');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test');
    vi.stubEnv('VAPID_SUBJECT', 'mailto:starthub@example.org');
  }, 60_000);
  afterAll(async () => { vi.unstubAllEnvs(); await closeDb(); });
  beforeEach(() => { gesendet.length = 0; antwort = 'ok'; });

  it('one hint: what it is and where the details are; several: one notification', () => {
    expect(nachricht([{ id: 'h1', kind: 'waiting', text: 'Tom Kraus wartet auf Antwort.', href: '/mail?t=abc' }]))
      .toEqual({ title: 'Wartet', body: 'Tom Kraus wartet auf Antwort.', url: '/mail?t=abc', tag: 'h1' });
    const vier = nachricht(['a', 'b', 'c', 'd'].map((x) => ({ id: x, kind: 'overdue', text: `${x}.`, href: '/m/x' })));
    expect(vier).toEqual({ title: '4 neue Hinweise', body: 'a.\nb.\nc.\nund 1 weitere', url: '/heute', tag: 'hinweise' });
  });

  it('quiet hours: Monday to Friday 07:00–20:00 Berlin', () => {
    expect(ruhezeit(new Date('2026-10-05T06:59:00+02:00'))).toBe(true); // Monday
    expect(ruhezeit(new Date('2026-10-05T07:00:00+02:00'))).toBe(false);
    expect(ruhezeit(new Date('2026-10-09T19:59:00+02:00'))).toBe(false); // Friday
    expect(ruhezeit(new Date('2026-10-09T20:00:00+02:00'))).toBe(true);
    expect(ruhezeit(new Date('2026-10-10T10:00:00+02:00'))).toBe(true); // Saturday
  });

  it('the subscription is stored encrypted, also in the action log; own devices only (RLS); never by the model', async () => {
    const { result } = await anmelden(andreas, 1);
    const roh = (await withSystem((tx) => tx.execute<{ subscription: string; payload: string }>(sql`
      SELECT s.subscription, (SELECT a.payload::text FROM actions a WHERE a.type = 'push.subscribe' ORDER BY a.created_at DESC LIMIT 1) AS payload
      FROM push_subscriptions s WHERE s.id = ${result.id}`))).rows[0]!;
    expect(roh.subscription.startsWith('enc:v1:')).toBe(true);
    for (const geheim of ['push.example.org', 'p256dh-1', 'auth-1']) {
      expect(roh.subscription).not.toContain(geheim);
      expect(roh.payload).not.toContain(geheim);
    }
    expect((await withUser(julia, (tx) => tx.execute(sql`SELECT 1 FROM push_subscriptions`))).rows).toHaveLength(0);
    await runAction(user(julia), 'push.unsubscribe', { id: result.id }); // RLS: nothing happens
    expect((await withUser(andreas, (tx) => tx.execute(sql`SELECT 1 FROM push_subscriptions`))).rows).toHaveLength(1);
    await expectRejects(runAction({ type: 'model', userId: andreas }, 'push.subscribe', { ...verschluesseln(abo(9)), label: 'x' }), /may not run/);
  });

  it('quiet hours: nothing goes out, nothing is lost', async () => {
    await regelnAnwenden(NOW);
    expect(await benachrichtigen(new Date('2026-10-03T10:00:00+02:00'))).toBe(0); // Saturday
    expect(gesendet).toHaveLength(0);
    expect((await withSystem((tx) => tx.execute(sql`SELECT 1 FROM hints WHERE notified_at IS NOT NULL`))).rows).toHaveLength(0);
  });

  it('personal hints go to the person’s devices once, as one notification; team hints do not', async () => {
    expect(await benachrichtigen(NOW)).toBe(1);
    expect(gesendet).toHaveLength(1); // andreas has a device, julia none
    const offen = (await withSystem((tx) => tx.execute<{ text: string }>(sql`
      SELECT text FROM hints WHERE user_id = ${andreas} AND status = 'open' ORDER BY created_at`))).rows;
    expect(gesendet[0]!.n.title).toBe(offen.length === 1 ? expect.any(String) : `${offen.length} neue Hinweise`);
    expect(gesendet[0]!.n.body).toContain(offen[0]!.text);
    // julia had no device: her hints count as told (no flood when she turns it on later); team hints are not told
    const nicht = (await withSystem((tx) => tx.execute<{ user_id: string | null }>(sql`SELECT user_id FROM hints WHERE notified_at IS NULL`))).rows;
    expect(nicht.every((h) => h.user_id === null)).toBe(true);
    expect(await benachrichtigen(NOW)).toBe(0);
    expect(gesendet).toHaveLength(1);
  });

  it('a single new hint links to the place of its details – the mail thread', async () => {
    const [m] = (await withSystem((tx) => tx.execute<{ id: string; thread_key: string }>(sql`
      SELECT id, thread_key FROM entries WHERE kind = 'mail' AND thread_key IS NOT NULL LIMIT 1`))).rows;
    await runAction({ type: 'system' }, 'hint.create', { kind: 'waiting', user_id: andreas, text: 'Lena Vogt wartet auf Antwort.', target_type: 'entry', target_id: m!.id, dedupe_key: 'test:push:mail' });
    await benachrichtigen(NOW);
    expect(gesendet[0]!.n).toMatchObject({ title: 'Wartet', body: 'Lena Vogt wartet auf Antwort.', url: `/mail?t=${encodeURIComponent(m!.thread_key)}` });
  });

  it('the person’s rules apply: "keine Hängt-Hinweise" never comes, "nur montags" waits for Monday', async () => {
    await runAction(user(andreas), 'instruction.create', { scope: 'personal', body_text: 'Keine Hängt-Hinweise', hinweise: { arten: ['stale'], aus: true } });
    await runAction(user(andreas), 'instruction.create', { scope: 'personal', body_text: 'Rat nur montags', hinweise: { arten: ['advice'], wochentage: [1] } });
    await runAction({ type: 'system' }, 'hint.create', { kind: 'stale', user_id: andreas, text: 'X hängt.', dedupe_key: 'test:push:stale' });
    await runAction({ type: 'system' }, 'hint.create', { kind: 'advice', user_id: andreas, text: 'Lade früher ein.', dedupe_key: 'test:push:rat' });
    await benachrichtigen(NOW); // Thursday
    expect(gesendet).toHaveLength(0);
    const stand = async (k: string) => (await withSystem((tx) => tx.execute<{ n: string | null }>(sql`SELECT notified_at AS n FROM hints WHERE dedupe_key = ${k}`))).rows[0]!.n;
    expect(await stand('test:push:stale')).not.toBeNull();
    expect(await stand('test:push:rat')).toBeNull();
    await benachrichtigen(new Date('2026-10-05T09:00:00+02:00')); // Monday
    expect(gesendet.map((g) => g.n.body)).toEqual(['Lade früher ein.']);
  });

  it('a device the push service no longer knows is removed; a passing error is tried again', async () => {
    await runAction({ type: 'system' }, 'hint.create', { kind: 'overdue', user_id: andreas, text: 'Y ist überfällig.', dedupe_key: 'test:push:fehler' });
    antwort = 'fehler';
    await benachrichtigen(NOW);
    antwort = 'ok';
    await benachrichtigen(NOW);
    expect(gesendet.map((g) => g.n.body)).toEqual(['Y ist überfällig.', 'Y ist überfällig.']);
    await runAction({ type: 'system' }, 'hint.create', { kind: 'overdue', user_id: andreas, text: 'Z ist überfällig.', dedupe_key: 'test:push:weg' });
    antwort = 'weg';
    await benachrichtigen(NOW);
    expect((await withUser(andreas, (tx) => tx.execute(sql`SELECT 1 FROM push_subscriptions`))).rows).toHaveLength(0);
  });
});
