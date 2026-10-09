// Stage 8: one run of everything the system says on its own – past events closed, rules (SQL),
// advice (think), then what is new goes out as a push notification.
import type { LanguageModel } from 'ai';
import { vergangeneSchliessen } from './abschluss';
import { benachrichtigen } from './push';
import { ratAnwenden, type RatLauf } from './rat';
import { regelnAnwenden, type Lauf } from './regeln';

export async function hinweiseLauf(now = new Date(), opts: { model?: LanguageModel } = {}): Promise<Lauf & RatLauf & { geschlossen: number; gesendet: number }> {
  // a broken date in one topic must not hold up the hints
  const geschlossen = await vergangeneSchliessen(now).catch((e) => { console.error('[abschluss]', e instanceof Error ? e.message : e); return 0; });
  const r = await regelnAnwenden(now);
  const a = await ratAnwenden(now, opts);
  const gesendet = await benachrichtigen(now);
  return { geschlossen, ...r, ...a, gesendet };
}
