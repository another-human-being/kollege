import type { entries } from '@/lib/db/schema';

type Entry = typeof entries.$inferSelect;

/** all addresses involved in a mail or event, lowercase */
export function participants(entry: Entry): string[] {
  const m = entry.meta as Record<string, unknown>;
  if (entry.kind === 'mail') {
    const addr = (a: unknown) => (a as { email: string }).email;
    return [addr(m.from), ...((m.to as unknown[]) ?? []).map(addr), ...((m.cc as unknown[]) ?? []).map(addr)];
  }
  if (entry.kind === 'event') return [m.organizer as string, ...((m.attendees as string[]) ?? [])];
  return [];
}

export function senderOf(entry: Entry): { name?: string; email: string } | null {
  return entry.kind === 'mail' ? ((entry.meta as { from: { name?: string; email: string } }).from ?? null) : null;
}
