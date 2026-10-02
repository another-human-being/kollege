// Model role "fast" (§7.2.4): one structured answer per entry. MODEL_FAST=oracle answers
// from fixtures/expected.json (tests, development); otherwise the configured model, with a
// schema narrowed to the candidates (lib/model/schemas.ts) and the team's corrections (§7.4).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { generateText, Output, type LanguageModel } from 'ai';
import type { Tx } from '@/lib/db/client';
import type { entries } from '@/lib/db/schema';
import type { Candidates } from '@/lib/pipeline/candidates';
import { korrekturBeispiele } from '@/lib/pipeline/korrekturen';
import { berlinDate } from '@/lib/time';
import { getModel, logCall, modelName } from './models';
import { oracleAnswer } from './oracle';
import { FastOutput, fastOutputFor } from './schemas';

export interface FastInput {
  entry: typeof entries.$inferSelect;
  candidates: Candidates;
}

export interface FastOptions {
  /** test seam; default getModel('fast') */
  model?: LanguageModel;
  now?: Date;
}

const BODY_CHARS = 8_000;
const ATTACHMENT_CHARS = 1_500;

let prompt: string | undefined;
const zuordnungPrompt = () => (prompt ??= readFileSync(join(process.cwd(), 'lib/model/prompts/zuordnung.md'), 'utf8'));

const adr = (a: unknown) => {
  const x = a as { name?: string; email: string } | undefined;
  return x ? (x.name ? `${x.name} <${x.email}>` : x.email) : '';
};

/** the entry and everything the model may choose from, as text */
export async function fastPrompt(tx: Tx, input: FastInput, now: Date): Promise<string> {
  const { entry: e, candidates: c } = input;
  const m = e.meta as Record<string, unknown>;
  const team = (await tx.execute<{ name: string; email: string }>(sql`SELECT name, email FROM users ORDER BY name`)).rows;
  const holders = e.visible_to.length
    ? (await tx.execute<{ name: string }>(sql`SELECT name FROM users WHERE id = ANY(${`{${e.visible_to.join(',')}}`}::uuid[]) ORDER BY name`)).rows.map((u) => u.name)
    : [];
  const areas = (await tx.execute<{ key: string; name_plural: string; matter_kind: string; fields: { key: string; label: string; type: string }[] }>(sql`
    SELECT key, name_plural, matter_kind, fields FROM areas ORDER BY sort`)).rows;
  const anweisungen = (await tx.execute<{ text: string; area: string | null }>(sql`
    SELECT e.body_text AS text, a.name_plural AS area FROM entries e LEFT JOIN areas a ON a.id = e.instruction_area_id
    WHERE e.kind = 'instruction' AND e.instruction_user_id IS NULL ORDER BY e.occurred_at`)).rows;
  const korrekturen = await korrekturBeispiele(tx, e);
  const atts = (m.attachments as { filename: string; text: string | null }[] | undefined) ?? [];

  const eintrag =
    e.kind === 'mail'
      ? [`Art: Mail (${String(m.folder ?? '')})`, `Von: ${adr(m.from)}`, `An: ${((m.to as unknown[]) ?? []).map(adr).join(', ')}`,
         ...(((m.cc as unknown[]) ?? []).length ? [`Cc: ${((m.cc as unknown[]) ?? []).map(adr).join(', ')}`] : [])]
      : e.kind === 'event'
        ? [`Art: Termin`, `Von ${String(m.start)} bis ${String(m.end)}`, `Ort: ${String(m.location ?? '–')}`, `Organisator: ${String(m.organizer)}`,
           `Teilnehmende: ${((m.attendees as string[]) ?? []).join(', ')}`]
        : [`Art: Datei`, `Pfad: ${String(m.path ?? e.title)}`];

  return [
    `Heute: ${berlinDate(now)}. ${e.historical ? 'Dies ist ein Import älterer Einträge.' : 'Dies ist ein neuer Eingang.'}`,
    `Team des StartHub: ${team.map((u) => `${u.name} <${u.email}>`).join(', ')}.`,
    holders.length ? `Der Eintrag liegt bei: ${holders.join(', ')}.` : 'Der Eintrag liegt in einer Team-Quelle.',
    '',
    'Bereiche (area_key):',
    ...areas.map((a) => `- ${a.key}: ${a.name_plural}${a.matter_kind === 'org_based' ? ' (Gründungsteams als Organisationen, Anliegen als Themen)' : ''}; Felder: ${a.fields.map((f) => `${f.key} (${f.type})`).join(', ') || '–'}`),
    '',
    'Kandidaten – Einträge:',
    ...(c.matters.length ? c.matters.map((x) => `- ${x.id}: „${x.title}“ (${x.area_key}, ${x.status})`) : ['- keine']),
    'Kandidaten – Personen:',
    ...(c.people.length ? c.people.map((x) => `- ${x.id}: ${x.name} ${x.emails.join(', ')}`) : ['- keine']),
    'Kandidaten – Organisationen:',
    ...(c.orgs.length ? c.orgs.map((x) => `- ${x.id}: ${x.name} (${x.role})`) : ['- keine']),
    '',
    ...(korrekturen.length ? ['Korrekturen des Teams:', ...korrekturen.map((k) => `- ${k}`), ''] : []),
    ...(anweisungen.length ? ['Anweisungen des Teams:', ...anweisungen.map((a) => `- ${a.area ? `[${a.area}] ` : ''}„${a.text}“`), ''] : []),
    '--- Eintrag ---',
    ...eintrag,
    `Datum: ${e.occurred_at.toISOString()} (Ortszeit ${berlinDate(e.occurred_at)})`,
    `Betreff: ${e.title ?? '–'}`,
    '',
    (e.body_text ?? '').slice(0, BODY_CHARS),
    ...atts.flatMap((a) => [`--- Anhang ${a.filename} ---`, (a.text ?? '(kein Text)').slice(0, ATTACHMENT_CHARS)]),
  ].join('\n');
}

export async function assignWithFast(tx: Tx, input: FastInput, opts: FastOptions = {}): Promise<FastOutput | null> {
  if (!opts.model && process.env.MODEL_FAST === 'oracle') {
    const key = (input.entry.meta as { fixture_key?: string }).fixture_key;
    if (!key) throw new Error('oracle: entry has no meta.fixture_key');
    return oracleAnswer(tx, key);
  }
  const model = opts.model ?? getModel('fast');
  const now = opts.now ?? new Date();
  const areaKeys = (await tx.execute<{ key: string }>(sql`SELECT key FROM areas ORDER BY sort`)).rows.map((a) => a.key);
  const started = Date.now();
  const log = { role: 'fast' as const, model: modelName(model), purpose: input.entry.historical ? 'import' : 'zuordnung' };
  try {
    const r = await generateText({
      model,
      instructions: zuordnungPrompt(),
      prompt: await fastPrompt(tx, input, now),
      output: Output.object({ schema: fastOutputFor(input.candidates, areaKeys) }),
      maxRetries: 2,
    });
    await logCall({ ...log, durationMs: Date.now() - started, inputTokens: r.totalUsage.inputTokens, outputTokens: r.totalUsage.outputTokens });
    // the narrowed answer is a valid wide answer; parse fills the defaults
    return FastOutput.parse(r.output);
  } catch (e) {
    await logCall({ ...log, durationMs: Date.now() - started, error: String(e) });
    throw e;
  }
}
