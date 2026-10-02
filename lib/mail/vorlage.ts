// Prefill for answering and forwarding (E26/E38: as in common mail programs): recipients,
// "Re:"/"Fwd:", the quoted text; forwarded attachments come along. From the mailbox that
// holds the mail (mine before the team's).
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { zeitpunkt } from '@/lib/format';

type Adresse = { name?: string; email: string };

export async function entwurfVorlage(userId: string, art: 'neu' | 'antwort' | 'allen' | 'weiterleitung', bezugId?: string) {
  return withUser(userId, async (tx) => {
    const boxes = (await tx.execute<{ id: string; user_id: string | null; address: string | null }>(sql`
      SELECT id, user_id, config->>'address' AS address FROM connections
      WHERE kind = 'mail' AND status <> 'disabled' AND (user_id = ${userId} OR user_id IS NULL)
      ORDER BY user_id IS NULL, created_at`)).rows;
    const mine = boxes[0];
    if (!mine) throw new Error('mailbox not found or not yours');
    if (art === 'neu' || !bezugId) return { connection_id: mine.id };

    const b = (await tx.execute<{ id: string; title: string | null; body_text: string | null; meta: Record<string, unknown>; occurred_at: string; box: string | null }>(sql`
      SELECT e.id, e.title, e.body_text, e.meta, e.occurred_at,
             (SELECT mc.connection_id FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id
              WHERE mc.entry_id = e.id ORDER BY c.user_id IS NULL LIMIT 1) AS box
      FROM entries e WHERE e.id = ${bezugId} AND e.kind = 'mail'`)).rows[0];
    if (!b) throw new Error('mail to answer not found');
    const box = boxes.find((x) => x.id === b.box) ?? mine;
    const ich = new Set(boxes.map((x) => (x.address ?? '').toLowerCase()));
    const von = b.meta.from as Adresse;
    const an = (b.meta.to as Adresse[] | undefined) ?? [];
    const cc = (b.meta.cc as Adresse[] | undefined) ?? [];
    const betreff = b.title ?? '';
    const zitat = (b.body_text ?? '').split('\n').map((l) => `> ${l}`).join('\n');
    const kopf = `Am ${zeitpunkt(new Date(b.occurred_at).toISOString(), new Date())} schrieb ${von.name ?? von.email}:`;

    if (art === 'weiterleitung') {
      return {
        connection_id: box.id, art: 'weiterleitung' as const, bezug_entry_id: b.id,
        subject: /^(fwd|wg):/i.test(betreff) ? betreff : `Fwd: ${betreff}`,
        body: `\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${von.name ? `${von.name} <${von.email}>` : von.email}\nBetreff: ${betreff}\n\n${b.body_text ?? ''}`,
        attachments: ((b.meta.attachments as { blob_path: string; filename: string; mime: string }[] | undefined) ?? [])
          .map(({ blob_path, filename, mime }) => ({ blob_path, filename, mime })),
      };
    }
    // a reply to my own sent mail goes to its recipients again
    const eigene = ich.has(von.email.toLowerCase());
    const to = eigene ? an.map((a) => a.email) : [von.email];
    const weitere = art === 'allen' ? [...an, ...cc].map((a) => a.email).filter((e) => !ich.has(e.toLowerCase()) && !to.includes(e)) : [];
    return {
      connection_id: box.id, art: 'antwort' as const, bezug_entry_id: b.id,
      to, cc: [...new Set(weitere)],
      subject: /^(re|aw):/i.test(betreff) ? betreff : `Re: ${betreff}`,
      body: `\n\n${kopf}\n${zitat}`,
    };
  });
}
