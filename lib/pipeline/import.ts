// §7.3 Import (first connection): same path, historical=true, bundled.
// Processing order: mail, then events, then files – each chronologically – so that
// matters exist before later items refer to them (finding, see STAND.md).
import { count, eq, sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { withSystem } from '@/lib/db/client';
import { entries, matters, orgs, people } from '@/lib/db/schema';
import { syncConnection } from './ingest';
import type { FastOptions } from '@/lib/model/fast';
import { processEntry, type ProcessResult } from './process';

export async function pendingEntryIds(): Promise<string[]> {
  const rows = await withSystem((tx) =>
    tx
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.processing_state, 'pending'))
      .orderBy(
        sql`CASE ${entries.kind} WHEN 'mail' THEN 0 WHEN 'event' THEN 1 WHEN 'file' THEN 2 ELSE 3 END`,
        entries.occurred_at,
        entries.id,
      ),
  );
  return rows.map((r) => r.id);
}

export interface ImportResult {
  results: Map<string, ProcessResult>;
  unreviewed: number;
  reviewHintId?: string;
}

export async function runImport(connectionIds: string[], opts: { now?: Date; importId?: string } & FastOptions = {}): Promise<ImportResult> {
  for (const id of connectionIds) await syncConnection(id, opts);

  const results = new Map<string, ProcessResult>();
  for (const id of await pendingEntryIds()) results.set(id, await processEntry(id, { model: opts.model, now: opts.now }));

  const unreviewed = await withSystem(async (tx) => {
    const n = async (t: typeof orgs | typeof people | typeof matters) =>
      (await tx.select({ n: count() }).from(t).where(eq(t.review_state, 'unreviewed')))[0]!.n;
    return (await n(orgs)) + (await n(people)) + (await n(matters));
  });

  let reviewHintId: string | undefined;
  if (unreviewed > 0) {
    const r = await runAction<{ id: string }>({ type: 'system' }, 'hint.create', {
      kind: 'review_batch',
      text: `${unreviewed} ungeprüft – prüfen`,
      reason: 'Import abgeschlossen',
      dedupe_key: `review_batch:${opts.importId ?? crypto.randomUUID()}`,
    });
    reviewHintId = r.result.id;
  }
  return { results, unreviewed, reviewHintId };
}

