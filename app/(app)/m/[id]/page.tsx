// Every link to a matter goes here and lands where it lives: topics of a founding team in
// the team's file (§4.3, E30), everything else in its area.
import { notFound, redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { withUser } from '@/lib/db/client';

export default async function MatterLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await withUser(await currentUserId(), (tx) =>
    tx.execute<{ key: string; matter_kind: string; org_id: string | null }>(sql`
      SELECT a.key, a.matter_kind, m.org_id FROM matters m JOIN areas a ON a.id = m.area_id WHERE m.id = ${id}`),
  );
  const m = r.rows[0];
  if (!m) notFound();
  redirect(m.matter_kind === 'org_based' && m.org_id ? `/b/${m.key}?id=${m.org_id}&thema=${id}` : `/b/${m.key}?id=${id}`);
}
