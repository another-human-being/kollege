// Download an attachment of a mail or draft. Access through the entry (RLS): an attachment is
// served only as part of an entry the user may read – never by its blob hash alone.
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { withUser } from '@/lib/db/client';
import { getBlob } from '@/lib/pipeline/blobs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  let userId: string;
  try {
    userId = await currentUserId();
  } catch {
    return new Response('nicht angemeldet', { status: 401 });
  }
  const { id, index } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d+$/.test(index)) return new Response('ungültig', { status: 400 });
  const a = await withUser(userId, async (tx) => {
    const r = await tx.execute<{ a: { filename: string; mime: string; blob_path: string } | null }>(sql`
      SELECT coalesce(meta->'attachments', '[]'::jsonb)->${Number(index)} AS a FROM entries WHERE id = ${id} AND kind IN ('mail', 'draft')`);
    return r.rows[0]?.a ?? null;
  });
  if (!a) return new Response('nicht gefunden', { status: 404 });
  const data = await getBlob(a.blob_path);
  return new Response(new Uint8Array(data), {
    headers: {
      // never rendered inline: attachments come from outside
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
    },
  });
}
