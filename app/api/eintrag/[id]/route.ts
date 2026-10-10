// One entry as evidence (Kontakte: "Worauf beruht das?"): mail, event, file or note as text for the
// viewer at the bottom right. With the person's rights (RLS): what they may not read stays hidden.
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { withUser } from '@/lib/db/client';
import { ART, type Beleg } from '@/lib/views/belege';

const MAX_TEXT = 30_000;

const adr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : [])
  .map((x) => (typeof x === 'string' ? x : (x as { name?: string; email?: string }).name || (x as { email?: string }).email))
  .filter(Boolean).join(', ') || null;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await currentUserId();
  } catch {
    return new Response('nicht angemeldet', { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('ungültig', { status: 400 });
  const e = await withUser(userId, async (tx) => (await tx.execute<{ id: string; kind: string; title: string | null; occurred_at: string; body_text: string | null; summary: string | null; meta: Record<string, unknown>; thread_key: string | null }>(sql`
    SELECT id, kind, title, occurred_at, body_text, summary, meta, thread_key FROM entries WHERE id = ${id}`)).rows[0]);
  if (!e) return new Response('nicht gefunden', { status: 404 });
  const m = e.meta;
  const art = ART[e.kind] ?? 'Notiz';
  const beleg: Beleg = {
    id: e.id, art, titel: e.title ?? '(ohne Titel)', am: new Date(e.occurred_at).toISOString(),
    von: e.kind === 'mail' ? adr(m.from) : e.kind === 'event' ? adr(m.organizer) : null,
    an: e.kind === 'mail' ? adr(m.to) : e.kind === 'event' ? adr(m.attendees) : null,
    text: (e.body_text || e.summary || '').slice(0, MAX_TEXT),
    anhaenge: Array.isArray(m.attachments) ? (m.attachments as { filename?: string }[]).map((a) => a.filename ?? 'Anhang') : [],
    href: e.kind === 'mail' ? (e.thread_key ? `/mail?t=${encodeURIComponent(e.thread_key)}` : '/mail')
      : e.kind === 'event' ? `/kalender?t=${e.id}` : e.kind === 'file' ? `/dateien?d=${e.id}` : '/heute',
  };
  return Response.json(beleg, { headers: { 'cache-control': 'private, no-store' } });
}
