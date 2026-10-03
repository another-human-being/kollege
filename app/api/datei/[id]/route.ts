// Download a file (drive or mail attachment). Access through the entry (RLS), never by blob hash.
// Never rendered inline: files may come from outside.
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { withUser } from '@/lib/db/client';
import { getBlob } from '@/lib/pipeline/blobs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await currentUserId();
  } catch {
    return new Response('nicht angemeldet', { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('ungültig', { status: 400 });
  const f = await withUser(userId, async (tx) => {
    const r = await tx.execute<{ title: string | null; blob_path: string | null; zu_gross: boolean }>(sql`
      SELECT title, blob_path, meta ? 'zu_gross' AS zu_gross FROM entries WHERE id = ${id} AND kind = 'file'`);
    return r.rows[0] ?? null;
  });
  if (!f?.blob_path || f.zu_gross) return new Response('nicht gefunden', { status: 404 });
  const data = await getBlob(f.blob_path);
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.title ?? 'datei')}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
    },
  });
}
