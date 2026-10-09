'use server';
// Push notifications on this device (Einstellungen → Benachrichtigungen). The browser hands over
// its subscription; it is encrypted before it reaches the action layer.
import { refresh } from 'next/cache';
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { runAction } from '@/lib/actions';
import { withUser } from '@/lib/db/client';
import { endpunktHash, PushAbo, senden, verschluesseln } from '@/lib/push/senden';
import type { Result } from './actions';

export async function pushAn(abo: unknown, label: string): Promise<Result> {
  const parsed = PushAbo.safeParse(abo);
  if (!parsed.success) return { ok: false, error: 'Dieser Browser hat keine gültige Anmeldung geliefert.' };
  try {
    const userId = await currentUserId();
    const { actionId, result } = await runAction({ type: 'user', userId }, 'push.subscribe', { ...verschluesseln(parsed.data), label: label.slice(0, 80) || 'Gerät' });
    refresh();
    return { ok: true, actionId, result };
  } catch (e) {
    console.error('[push]', e);
    return { ok: false, error: 'Das ging nicht. Ist das Gerät schon für jemand anderen angemeldet?' };
  }
}

/** this device off: by its endpoint (the browser knows it, the server only its hash) */
export async function pushAus(endpoint: string): Promise<Result> {
  const userId = await currentUserId();
  const [g] = (await withUser(userId, (tx) => tx.execute<{ id: string }>(sql`
    SELECT id FROM push_subscriptions WHERE endpoint_hash = ${endpunktHash(endpoint)}`))).rows;
  if (!g) return { ok: true, actionId: '' };
  const { actionId } = await runAction({ type: 'user', userId }, 'push.unsubscribe', { id: g.id });
  refresh();
  return { ok: true, actionId };
}

/** a test notification to one's own devices – to see that it arrives */
export async function pushProbe(): Promise<{ ok: boolean; text: string }> {
  const userId = await currentUserId();
  const geraete = (await withUser(userId, (tx) => tx.execute<{ id: string; subscription: string }>(sql`
    SELECT id, subscription FROM push_subscriptions`))).rows;
  if (!geraete.length) return { ok: false, text: 'Kein Gerät eingeschaltet.' };
  let ok = 0;
  for (const g of geraete) {
    const r = await senden(g.subscription, { title: 'Kollege', body: 'Probe: So sehen Hinweise aus. Tippen öffnet Heute.', url: '/heute', tag: 'probe' });
    if (r === 'ok') ok++;
    if (r === 'weg') await runAction({ type: 'user', userId }, 'push.unsubscribe', { id: g.id });
  }
  refresh();
  return ok ? { ok: true, text: `Gesendet an ${ok === 1 ? '1 Gerät' : `${ok} Geräte`}.` } : { ok: false, text: 'Nicht angekommen. Das Gerät ist abgemeldet oder der Push-Dienst nicht erreichbar.' };
}
