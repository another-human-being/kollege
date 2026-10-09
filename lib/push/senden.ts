// Web Push (RFC 8030/8291, VAPID): the notification goes from Kollege through the push service
// of the browser (Apple, Google, Mozilla) to the device. The content is encrypted for the device;
// the push service sees neither text nor link. Keys come from the environment (VAPID_*), the
// device subscriptions from push_subscriptions (encrypted with APP_SECRET).
import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { z } from 'zod';
import { decrypt, encrypt } from '@/lib/crypto';

export const PushAbo = z.object({
  endpoint: z.url().startsWith('https://'),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
export type PushAbo = z.infer<typeof PushAbo>;

export interface Nachricht { title: string; body: string; url: string; tag: string }

/** the public key the browser needs to subscribe; null when push is not set up (npm run einrichten) */
export function vapidOeffentlich(): string | null {
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: wer } = process.env;
  // the push services want a contact (mailto: or https:); Apple refuses localhost
  return pub && priv && wer && /^(mailto:|https:\/\/)/.test(wer) ? pub : null;
}

export const endpunktHash = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');

/** what push.subscribe stores: never the subscription in plain text */
export function verschluesseln(abo: PushAbo): { endpoint_hash: string; subscription: string } {
  return { endpoint_hash: endpunktHash(abo.endpoint), subscription: encrypt(JSON.stringify(abo)) };
}

export type Ergebnis = 'ok' | 'weg' | 'fehler';

/** one message to one device: "weg" = the push service no longer knows it (remove it) */
export async function senden(gespeichert: string, n: Nachricht): Promise<Ergebnis> {
  const pub = vapidOeffentlich();
  if (!pub) return 'fehler';
  const abo = PushAbo.parse(JSON.parse(decrypt(gespeichert)));
  try {
    await webpush.sendNotification(abo, JSON.stringify(n), {
      vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: pub, privateKey: process.env.VAPID_PRIVATE_KEY! },
      TTL: 12 * 3600,
      urgency: 'normal',
      topic: n.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined,
    });
    return 'ok';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'weg';
    console.error('[push]', status ?? '', e instanceof Error ? e.message : e);
    return 'fehler';
  }
}
