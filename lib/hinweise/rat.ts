// Rat aus früheren Fällen (§9.3, stage 8). A new topic in an area with a predecessor or with
// comparable finished topics: think reads them (entries, commitments, outcome note, numbers
// computed in SQL) and gives at most one advice hint with evidence (decision 41):
// - a predecessor set by a person is enough (a person declared it comparable);
// - otherwise at least two comparable finished topics (Denkweise 5: fewer is too little experience);
// - exactly one and no predecessor: one question instead – "Is that the predecessor?" (Denkweise 9).
// Guards in code: quotes must stand in their source, every number of the advice in the data.
import { generateText, Output, type LanguageModel } from 'ai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { runAction } from '@/lib/actions';
import { withSystem } from '@/lib/db/client';
import { getModel, logCall, modelName, modelSpec } from '@/lib/model/models';
import { schluessel } from './schluessel';

const SYSTEM = { type: 'system' } as const;
/** topics created this recently are looked at; older ones had their chance */
const FENSTER_TAGE = 3;
const MAX_FAELLE = 3;
const MAX_EINTRAEGE = 15;

const STOP = new Set(['und', 'oder', 'für', 'mit', 'beim', 'eine', 'einer', 'eines', 'der', 'die', 'das', 'zum', 'zur', 'von', 'vom', 'über', 'nach']);

/** significant words of a title: letters only, at least 4, no stop words – as a tsquery "a | b" */
export function titelWoerter(titel: string): string[] {
  return [...new Set((titel.toLowerCase().match(/\p{L}+/gu) ?? []).filter((w) => w.length >= 4 && !STOP.has(w)))];
}

const RatAusgabe = z.object({
  rat: z.string().max(400).nullable(),
  belege: z.array(z.object({ id: z.string(), zitat: z.string().min(3) })).max(3),
});
type RatAusgabe = z.infer<typeof RatAusgabe>;

interface Quelle { id: string; titel: string; text: string }
interface Fall { id: string; titel: string; text: string; quellen: Quelle[] }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const zahlen = (s: string) => s.match(/\d+(?:[.,]\d+)?/g) ?? [];

async function fallAus(matterId: string): Promise<Fall> {
  return withSystem(async (tx) => {
    const [m] = (await tx.execute<{ id: string; title: string; fields: Record<string, unknown>; outcome_note: string | null; date_start: string | null; date_end: string | null; status: string; area: string }>(sql`
      SELECT m.id, m.title, m.fields, m.outcome_note, m.date_start, m.date_end, m.status, a.name_singular AS area
      FROM matters m JOIN areas a ON a.id = m.area_id WHERE m.id = ${matterId}`)).rows;
    const zahl = (await tx.execute<{ eintraege: number; mails: number; ours: number; ours_done: number; theirs: number; theirs_late: number }>(sql`
      SELECT (SELECT count(*)::int FROM links l WHERE l.target_type = 'matter' AND l.target_id = ${matterId}) AS eintraege,
             (SELECT count(*)::int FROM links l JOIN entries e ON e.id = l.entry_id WHERE l.target_type = 'matter' AND l.target_id = ${matterId} AND e.kind = 'mail') AS mails,
             (SELECT count(*)::int FROM tasks WHERE matter_id = ${matterId} AND direction = 'ours') AS ours,
             (SELECT count(*)::int FROM tasks WHERE matter_id = ${matterId} AND direction = 'ours' AND status = 'done') AS ours_done,
             (SELECT count(*)::int FROM tasks WHERE matter_id = ${matterId} AND direction = 'theirs') AS theirs,
             (SELECT count(*)::int FROM tasks WHERE matter_id = ${matterId} AND direction = 'theirs' AND due_at IS NOT NULL
                AND (done_at > due_at OR (status <> 'done' AND due_at < now()))) AS theirs_late`)).rows[0]!;
    const eintraege = (await tx.execute<{ id: string; kind: string; title: string | null; summary: string | null; body_text: string | null; occurred_at: string }>(sql`
      SELECT e.id, e.kind, e.title, e.summary, e.body_text, e.occurred_at FROM links l JOIN entries e ON e.id = l.entry_id
      WHERE l.target_type = 'matter' AND l.target_id = ${matterId} AND e.kind IN ('note', 'file', 'mail', 'event')
      ORDER BY (e.kind IN ('note', 'file')) DESC, e.occurred_at DESC LIMIT ${MAX_EINTRAEGE}`)).rows;
    const aufgaben = (await tx.execute<{ id: string; title: string; direction: string; status: string; due_at: string | null }>(sql`
      SELECT id, title, direction, status, due_at FROM tasks WHERE matter_id = ${matterId} ORDER BY due_at NULLS LAST LIMIT 20`)).rows;
    const quellen: Quelle[] = eintraege.map((e) => ({
      id: e.id, titel: `${e.kind === 'file' ? 'Datei' : e.kind === 'note' ? 'Notiz' : e.kind === 'mail' ? 'Mail' : 'Termin'} „${e.title ?? '(ohne Titel)'}“`,
      text: [e.summary, (e.body_text ?? '').slice(0, 1200)].filter(Boolean).join('\n'),
    }));
    if (m!.outcome_note) quellen.unshift({ id: m!.id, titel: `Rückblick „${m!.title}“`, text: m!.outcome_note });
    const text = [
      `## ${m!.area}: ${m!.title} (${m!.status === 'done' ? 'abgeschlossen' : 'offen'})`,
      `ID: ${m!.id}`,
      m!.date_start ? `Datum: ${m!.date_start.slice(0, 10)}${m!.date_end ? ` bis ${m!.date_end.slice(0, 10)}` : ''}` : null,
      Object.keys(m!.fields ?? {}).length ? `Felder: ${JSON.stringify(m!.fields)}` : null,
      `Berechnet: ${zahl.eintraege} Einträge (davon ${zahl.mails} Mails); eigene Aufgaben ${zahl.ours_done} von ${zahl.ours} erledigt; Zusagen anderer ${zahl.theirs}, davon ${zahl.theirs_late} verspätet.`,
      aufgaben.length ? `Aufgaben und Zusagen:\n${aufgaben.map((t) => `- [${t.direction === 'ours' ? 'wir' : 'sie'}, ${t.status === 'done' ? 'erledigt' : 'offen'}] ${t.title}${t.due_at ? ` (bis ${t.due_at.slice(0, 10)})` : ''}`).join('\n')}` : null,
      ...quellen.map((q) => `### ${q.titel} [ID ${q.id}]\n${q.text}`),
    ].filter(Boolean).join('\n');
    return { id: m!.id, titel: m!.title, text, quellen };
  });
}

/** keeps only evidence that stands in its source; null when the advice does not hold up */
export function pruefen(out: RatAusgabe, faelle: Fall[], neu: string): { rat: string; belege: { quelle: Quelle; zitat: string }[] } | null {
  if (!out.rat?.trim()) return null;
  const quellen = new Map(faelle.flatMap((f) => f.quellen.map((q) => [q.id, q] as const)));
  const belege = out.belege.flatMap((b) => {
    const q = quellen.get(b.id);
    return q && norm(q.text).includes(norm(b.zitat)) ? [{ quelle: q, zitat: b.zitat.trim() }] : [];
  });
  if (!belege.length) return null;
  // numbers come from the data, never from memory (hard rule)
  const daten = norm([neu, ...faelle.flatMap((f) => [f.text, ...f.quellen.map((q) => q.text)])].join('\n'));
  if (zahlen(out.rat).some((z) => !daten.includes(z))) return null;
  return { rat: out.rat.trim(), belege };
}

/** deterministic stand-in for MODEL_THINK=skript: a lesson sentence ("nächstes …") from the earlier cases */
function skriptRat(faelle: Fall[]): RatAusgabe {
  for (const f of faelle) for (const q of f.quellen) {
    const satz = q.text.split(/(?<=[.!?])\s+/).find((s) => /nächste[snm]?\b/i.test(s));
    if (satz) return { rat: `Aus „${f.titel}“: ${satz.trim()}`, belege: [{ id: q.id, zitat: satz.trim() }] };
  }
  return { rat: null, belege: [] };
}

async function ratVomModell(neu: string, faelle: Fall[], model?: LanguageModel): Promise<RatAusgabe> {
  if (!model && modelSpec('think') === 'skript') return skriptRat(faelle);
  const m = model ?? getModel('think');
  const started = Date.now();
  const log = { role: 'think' as const, model: modelName(m), purpose: 'rat' };
  try {
    const r = await generateText({
      model: m,
      instructions: readFileSync(join(process.cwd(), 'lib/model/prompts/rat.md'), 'utf8'),
      prompt: `# Neuer Fall\n${neu}\n\n# Frühere Fälle\n${faelle.map((f) => f.text).join('\n\n')}`,
      output: Output.object({ schema: RatAusgabe }),
      maxRetries: 2,
    });
    await logCall({ ...log, durationMs: Date.now() - started, inputTokens: r.totalUsage.inputTokens, outputTokens: r.totalUsage.outputTokens });
    return RatAusgabe.parse(r.output);
  } catch (e) {
    await logCall({ ...log, durationMs: Date.now() - started, error: String(e) });
    throw e;
  }
}

export interface RatLauf { rat: number; fragen: number; ohne: number }

export async function ratAnwenden(now = new Date(), opts: { model?: LanguageModel } = {}): Promise<RatLauf> {
  const neue = await withSystem(async (tx) => (await tx.execute<{ id: string; title: string; area_id: string; owner_user_id: string | null; predecessor_id: string | null; fields: Record<string, unknown>; date_start: string | null; area: string }>(sql`
    SELECT m.id, m.title, m.area_id, m.owner_user_id, m.predecessor_id, m.fields, m.date_start, a.name_singular AS area
    FROM matters m JOIN areas a ON a.id = m.area_id
    WHERE m.status = 'open' AND m.review_state <> 'discarded' AND m.created_at > ${new Date(now.getTime() - FENSTER_TAGE * 86_400_000)}
      AND NOT EXISTS (SELECT 1 FROM hints h WHERE h.dedupe_key = 'advice:' || m.id::text)`)).rows);
  const lauf: RatLauf = { rat: 0, fragen: 0, ohne: 0 };
  for (const m of neue) {
    try {
      await ratFuer(m, now, opts, lauf);
    } catch (e) {
      // one topic that fails (model unreachable, bad answer) does not hold up the others; the next run tries again
      console.error('[rat]', m.id, e instanceof Error ? e.message : e);
    }
  }
  return lauf;
}

type Neu = { id: string; title: string; area_id: string; owner_user_id: string | null; predecessor_id: string | null; fields: Record<string, unknown>; date_start: string | null; area: string };

async function ratFuer(m: Neu, now: Date, opts: { model?: LanguageModel }, lauf: RatLauf): Promise<void> {
  {
    const woerter = titelWoerter(m.title);
    const aehnlich = woerter.length ? await withSystem(async (tx) => (await tx.execute<{ id: string; title: string }>(sql`
      SELECT v.id, v.title FROM matters v
      WHERE v.area_id = ${m.area_id} AND v.id <> ${m.id} AND v.status = 'done' AND v.review_state <> 'discarded'
        AND v.id IS DISTINCT FROM ${m.predecessor_id}
        AND to_tsvector('german', v.title) @@ to_tsquery('german', ${woerter.join(' | ')})
      ORDER BY v.updated_at DESC LIMIT ${MAX_FAELLE}`)).rows) : [];
    const user = m.owner_user_id ? { user_id: m.owner_user_id } : {};

    if (!m.predecessor_id && aehnlich.length === 1) {
      // one comparable case is too little experience – unless it is the predecessor: ask
      const key = schluessel.vorgaenger(m.id);
      const v = aehnlich[0]!;
      const da = await withSystem(async (tx) => (await tx.execute(sql`SELECT 1 FROM hints WHERE dedupe_key = ${key}`)).rows.length > 0);
      if (!da) {
        const id = crypto.randomUUID();
        await runAction(SYSTEM, 'hint.create', {
          id, kind: 'clarify', ...user, area_id: m.area_id, target_type: 'matter', target_id: m.id, dedupe_key: key,
          text: `Ist „${v.title}“ der Vorgänger von „${m.title}“?`,
          reason: 'Dann kann ich aus dem letzten Mal einen Rat ableiten.',
          options: [
            { label: 'Ja, Vorgänger', action_type: 'matter.update', payload: { id: m.id, predecessor_id: v.id } },
            { label: 'Nein', action_type: 'hint.dismiss', payload: { hint_id: id } },
          ],
        });
        lauf.fragen++;
      }
      return;
    }
    const faelleIds = [...(m.predecessor_id ? [m.predecessor_id] : []), ...aehnlich.map((a) => a.id)].slice(0, MAX_FAELLE);
    if (!m.predecessor_id && faelleIds.length < 2) return; // too little experience: say nothing, ask nothing
    const faelle = await Promise.all(faelleIds.map(fallAus));
    const neu = [`${m.area}: ${m.title}`, m.date_start ? `Datum: ${m.date_start.slice(0, 10)}` : null,
      Object.keys(m.fields ?? {}).length ? `Felder: ${JSON.stringify(m.fields)}` : null, `Heute: ${now.toISOString().slice(0, 10)}`].filter(Boolean).join('\n');
    const geprueft = pruefen(await ratVomModell(neu, faelle, opts.model), faelle, neu);
    const id = crypto.randomUUID();
    if (!geprueft) {
      // remembered, so that the next run does not ask again: a hint that is put aside at once (dismissed: it is no advice and shows nowhere)
      await runAction(SYSTEM, 'hint.create', { id, kind: 'advice', ...user, area_id: m.area_id, target_type: 'matter', target_id: m.id,
        dedupe_key: schluessel.rat(m.id), text: 'Dazu habe ich noch zu wenig Erfahrung.', reason: `verglichen mit ${faelle.map((f) => `„${f.titel}“`).join(', ')}` });
      await runAction(SYSTEM, 'hint.dismiss', { hint_id: id });
      lauf.ohne++;
      return;
    }
    await runAction(SYSTEM, 'hint.create', {
      id, kind: 'advice', ...user, area_id: m.area_id, target_type: 'matter', target_id: m.id, dedupe_key: schluessel.rat(m.id),
      text: geprueft.rat,
      reason: geprueft.belege.map((b) => `„${b.zitat}“ – ${b.quelle.titel}`).join(' · '),
      options: [{ label: 'Danke, gemerkt', action_type: 'hint.resolve', payload: { hint_id: id } }],
    });
    lauf.rat++;
  }
}
