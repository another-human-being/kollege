// process:<entry> – §7.2: filter, fixed assignment, candidates, fast model, gate,
// attachments. One transaction per entry: either everything or nothing (state error).
import { eq, sql } from 'drizzle-orm';
import { withSystem, type Tx } from '@/lib/db/client';
import { entries, personEmails } from '@/lib/db/schema';
import { assignWithFast, type FastOptions } from '@/lib/model/fast';
import { applyAssignment, type ApplyReport } from './apply';
import { fixedMatches } from './assign';
import { candidates } from './candidates';
import { filterReason } from './filter';
import { senderOf } from './participants';

type Entry = typeof entries.$inferSelect;

export type ProcessResult =
  | { state: 'skipped'; reason: string }
  | ({ state: 'done' } & ApplyReport)
  | { state: 'error'; error: string }
  | { state: 'not_pending' };

export async function processEntry(entryId: string, opts: FastOptions = {}): Promise<ProcessResult> {
  try {
    return await withSystem(async (tx) => {
      const [entry] = await tx.select().from(entries).where(eq(entries.id, entryId)).for('update');
      if (!entry || entry.processing_state !== 'pending') return { state: 'not_pending' } as const;

      const reason = filterReason(entry);
      if (reason) return markSkipped(tx, entry, reason);

      const fixed = await fixedMatches(tx, entry);
      const cands = await candidates(tx, entry, fixed);
      const out = await assignWithFast(tx, { entry, candidates: cands }, opts);
      if (out && !out.relevant) return markSkipped(tx, entry, 'irrelevant', out.summary);

      const report = await applyAssignment(tx, entry, fixed, cands, out);
      await storeAttachments(tx, entry);

      const sender = senderOf(entry);
      const [author] = sender
        ? await tx.select({ id: personEmails.person_id }).from(personEmails).where(eq(personEmails.email, sender.email))
        : [];
      await tx
        .update(entries)
        .set({ processing_state: 'done', summary: out?.summary, author_person_id: author?.id })
        .where(eq(entries.id, entry.id));
      return { state: 'done', ...report } as const;
    });
  } catch (e) {
    const error = e instanceof Error ? `${e.message}${e.cause instanceof Error ? `: ${e.cause.message}` : ''}` : String(e);
    await withSystem((tx) =>
      tx
        .update(entries)
        .set({ processing_state: 'error', meta: sql`${entries.meta} || jsonb_build_object('error', ${error}::text)` })
        .where(eq(entries.id, entryId)),
    );
    return { state: 'error', error };
  }
}

async function markSkipped(tx: Tx, entry: Entry, reason: string, summary?: string) {
  await tx
    .update(entries)
    .set({
      processing_state: 'skipped',
      summary,
      meta: sql`${entries.meta} || jsonb_build_object('skip_reason', ${reason}::text)`,
    })
    .where(eq(entries.id, entry.id));
  return { state: 'skipped', reason } as const;
}

/**
 * §7.2.6 Attachments become file entries pointing to their mail (meta.mail_entry_id;
 * links only know matter/person/org). Same visibility as the mail.
 * Summary by the fast model: the oracle has none – stays empty in stage 1.
 */
async function storeAttachments(tx: Tx, entry: Entry) {
  const atts = (entry.meta as { attachments?: { filename: string; mime: string; text: string | null; blob_path: string }[] })
    .attachments ?? [];
  for (const a of atts) {
    await tx
      .insert(entries)
      .values({
        kind: 'file',
        connection_id: entry.connection_id,
        external_id: `${entry.external_id}/${a.filename}`,
        dedupe_key: `${entry.dedupe_key}/${a.filename}#${a.blob_path}`,
        occurred_at: entry.occurred_at,
        title: a.filename,
        body_text: a.text,
        blob_path: a.blob_path,
        meta: { mime: a.mime, mail_entry_id: entry.id },
        visibility: entry.visibility,
        visible_to: entry.visible_to,
        historical: entry.historical,
        processing_state: 'done',
      })
      .onConflictDoNothing();
  }
}
