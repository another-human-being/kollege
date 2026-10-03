// Stage 8: one run of everything the system says on its own – rules (SQL) and advice (think).
import type { LanguageModel } from 'ai';
import { ratAnwenden, type RatLauf } from './rat';
import { regelnAnwenden, type Lauf } from './regeln';

export async function hinweiseLauf(now = new Date(), opts: { model?: LanguageModel } = {}): Promise<Lauf & RatLauf> {
  const r = await regelnAnwenden(now);
  const a = await ratAnwenden(now, opts);
  return { ...r, ...a };
}
