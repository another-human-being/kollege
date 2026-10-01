// Every link to an organisation lands where it lives: founding teams in their area, others in Kontakte.
import { notFound, redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { currentUserId } from '@/auth';
import { withUser } from '@/lib/db/client';

export default async function OrgLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await withUser(await currentUserId(), (tx) =>
    tx.execute<{ role: string; area_key: string | null }>(sql`
      SELECT o.role, (SELECT key FROM areas WHERE matter_kind = 'org_based' ORDER BY sort LIMIT 1) AS area_key
      FROM orgs o WHERE o.id = ${id}`),
  );
  const o = r.rows[0];
  if (!o) notFound();
  redirect(o.role === 'founding_team' && o.area_key ? `/b/${o.area_key}?id=${id}` : `/kontakte?typ=org&id=${id}`);
}
