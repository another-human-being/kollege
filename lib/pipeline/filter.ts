// §7.2.1 Filter. Skipped entries stay stored but are not linked.
import { isTeamAddress } from '@/lib/config';
import type { entries } from '@/lib/db/schema';
import { participants, senderOf } from './participants';

export type SkipReason = 'bulk' | 'noreply' | 'internal_only';

const NOREPLY = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster)([+.-][^@]*)?@/i;

export function filterReason(entry: typeof entries.$inferSelect): SkipReason | null {
  if (entry.kind !== 'mail') return null;
  const headers = Object.fromEntries(
    Object.entries(((entry.meta as { headers?: Record<string, string> }).headers) ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  if (headers['list-unsubscribe'] || /^(bulk|list|junk)$/i.test(headers['precedence'] ?? '')) return 'bulk';
  const sender = senderOf(entry);
  if (sender && NOREPLY.test(sender.email)) return 'noreply';
  // purely internal – only for mails (decision 2026-10-01: events are judged by the model)
  if (participants(entry).every(isTeamAddress)) return 'internal_only';
  // exclusion instructions ("Newsletter von X ignorieren") are plain language: they cannot be
  // checked without a model, so they go into the fast call, which answers relevant=false (STAND, decision 26)
  return null;
}
