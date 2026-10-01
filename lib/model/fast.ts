// Model role "fast" (reading, assigning). Stage 1 only knows the oracle;
// the real provider (Vercel AI SDK) is connected in stage 4.
import type { Tx } from '@/lib/db/client';
import type { entries } from '@/lib/db/schema';
import type { Candidates } from '@/lib/pipeline/candidates';
import { oracleAnswer } from './oracle';
import type { FastOutput } from './schemas';

export interface FastInput {
  entry: typeof entries.$inferSelect;
  candidates: Candidates;
}

export async function assignWithFast(tx: Tx, input: FastInput): Promise<FastOutput | null> {
  if (process.env.MODEL_FAST === 'oracle') {
    const key = (input.entry.meta as { fixture_key?: string }).fixture_key;
    if (!key) throw new Error('oracle: entry has no meta.fixture_key');
    return oracleAnswer(tx, key);
  }
  throw new Error(`MODEL_FAST=${process.env.MODEL_FAST ?? ''}: only "oracle" exists in stage 1`);
}
