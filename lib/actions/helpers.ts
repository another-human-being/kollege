import type { Actor } from './types';

/** Objects created by system or model start unreviewed (§6). */
export function reviewStateFor(actor: Actor): 'accepted' | 'unreviewed' {
  return actor.type === 'user' ? 'accepted' : 'unreviewed';
}

export const ALL_ACTORS = ['user', 'system', 'model'] as const;

