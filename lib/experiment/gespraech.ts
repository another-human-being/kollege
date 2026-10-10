// Experiment (10.10.2026, decided nothing yet): instead of taking every mail apart into tasks, Kollege
// keeps the STATE of a conversation – whose turn it is, the next step, open points with their
// status – and statements with evidence. The state is carried forward mail by mail: old state +
// new mail → new state. Read only: nothing in the database changes. Shown next to the tasks that
// the current pipeline made from the same thread.
import { generateText, Output, type LanguageModel } from 'ai';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { isTeamAddress } from '@/lib/config';
import { withSystem } from '@/lib/db/client';
import { neuerTeil, vergleichbar } from '@/lib/mail/zitat';

export const Zustand = z.object({
  ball: z.enum(['uns', 'sie', 'niemand', 'abgeschlossen']).describe('bei wem liegt der nächste Zug'),
  naechster_schritt: z.string().nullable().describe('ein Satz: was als Nächstes passieren muss, von wem'),
  zusammenfassung: z.string().describe('zwei bis drei Sätze: worum es in diesem Gespräch geht und wo es steht'),
  punkte: z.array(z.object({
    id: z.string().describe('stabil über das ganze Gespräch: p1, p2, …; bestehende Punkte behalten ihre id'),
    art: z.enum(['aufgabe', 'erwartung', 'bitte_an_uns']),
    text: z.string(),
    wer: z.string().nullable().describe('wer etwas schuldet bzw. wer bittet'),
    bis: z.string().nullable().describe('Frist als JJJJ-MM-TT oder null'),
    status: z.enum(['offen', 'erfuellt', 'entfallen']),
    beleg: z.string().describe('wörtliches Zitat aus der Mail, in der der Punkt entstand'),
    erledigt_beleg: z.string().nullable().describe('wörtliches Zitat, das zeigt, dass der Punkt erfüllt ist oder entfällt'),
  })),
  aussagen: z.array(z.object({
    art: z.enum(['zugehoerigkeit', 'rolle', 'teilnahme', 'sonstiges']),
    wer: z.string(),
    was: z.string().describe('z. B. „arbeitet bei HNU Gründungszentrum“, „Referentin beim Pitch-Abend“, „meldet sich zum Event an“'),
    beleg: z.string().describe('wörtliches Zitat'),
  })),
});
export type Zustand = z.infer<typeof Zustand>;

const ANWEISUNG = `Du führst für das StartHub-Team (Gründungszentrum der Universität Augsburg) den Stand eines Mail-Gesprächs.
Du bekommst den bisherigen Stand und die nächste Mail. Gib den neuen Stand des ganzen Gesprächs zurück.

Regeln:
- ball: "uns", wenn das StartHub-Team als Nächstes etwas tun oder antworten muss; "sie", wenn wir auf die andere Seite warten; "niemand", wenn nichts offen ist, das Gespräch aber nicht beendet; "abgeschlossen", wenn es erledigt ist.
- punkte sind die offenen Fäden des Gesprächs:
  - aufgabe: das StartHub-Team hat etwas zugesagt oder muss etwas tun.
  - erwartung: die andere Seite hat etwas zugesagt.
  - bitte_an_uns: jemand bittet uns um etwas, das wir noch nicht zugesagt haben. Das ist keine Aufgabe.
  - Anmeldungen, Teilnahmen und Informationen sind keine punkte, sondern aussagen.
- Schreibe bestehende Punkte fort, statt neue anzulegen: gleiche Sache = gleiche id. Ändert sich eine Frist, ändere "bis".
- Ist ein Punkt durch die neue Mail erfüllt (z. B. der zugesagte Anhang kam, wir haben geantwortet) oder entfällt er, setze den status und zitiere den Beleg in erledigt_beleg.
- Zitierte frühere Mails sind schon verarbeitet; leite daraus nichts Neues ab.
- aussagen: was die Mail über Personen verrät – Zugehörigkeit zu einer Organisation, Rolle (Referent:in, Mentor:in, Jury …), Teilnahme. Nur mit wörtlichem Beleg.
- Alle Zitate wörtlich aus der jeweiligen Mail kopieren. Nichts erfinden.`;

export interface Mail {
  id: string; am: Date; von: { name?: string; email: string } | null; an: string[]; betreff: string | null;
  text: string; anhaenge: string[]; vonUns: boolean;
}

export interface Verlauf { thread_key: string; betreff: string; aufgaben: { title: string; direction: string; status: string; due_at: string | null }[] }

/** the threads to look at: by subject, or those with the most tasks today */
export async function verlaeufe(opts: { anzahl: number; betreff?: string }): Promise<Verlauf[]> {
  return withSystem(async (tx) => {
    const keys = (await tx.execute<{ thread_key: string; betreff: string }>(opts.betreff ? sql`
      SELECT thread_key, min(title) AS betreff FROM entries WHERE kind = 'mail' AND thread_key IS NOT NULL AND title ILIKE ${`%${opts.betreff}%`}
      GROUP BY thread_key ORDER BY max(occurred_at) DESC LIMIT ${opts.anzahl}` : sql`
      SELECT s.thread_key, min(s.title) AS betreff FROM tasks t JOIN entries s ON s.id = t.source_entry_id
      WHERE s.thread_key IS NOT NULL GROUP BY s.thread_key ORDER BY count(*) DESC LIMIT ${opts.anzahl}`)).rows;
    const out: Verlauf[] = [];
    for (const k of keys) {
      const aufgaben = (await tx.execute<Verlauf['aufgaben'][number]>(sql`
        SELECT t.title, t.direction, t.status, t.due_at FROM tasks t JOIN entries s ON s.id = t.source_entry_id
        WHERE s.thread_key = ${k.thread_key} ORDER BY s.occurred_at, t.created_at`)).rows;
      out.push({ ...k, aufgaben });
    }
    return out;
  });
}

export async function mailsVon(threadKey: string): Promise<Mail[]> {
  return withSystem(async (tx) => (await tx.execute<{ id: string; occurred_at: string; meta: Record<string, unknown>; title: string | null; body_text: string | null }>(sql`
    SELECT DISTINCT ON (dedupe_key) id, occurred_at, meta, title, body_text FROM entries
    WHERE kind = 'mail' AND thread_key = ${threadKey} ORDER BY dedupe_key, occurred_at`)).rows
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    .map((e) => {
      const m = e.meta as { from?: { name?: string; email: string }; to?: { email: string; name?: string }[]; attachments?: { filename: string }[] };
      const voll = e.body_text ?? '';
      const neu = neuerTeil(voll, e.title);
      return {
        id: e.id, am: new Date(e.occurred_at), von: m.from ?? null, an: (m.to ?? []).map((a) => a.name ?? a.email), betreff: e.title,
        // a very short new part is usually a cut that went wrong: then the whole text
        text: neu.length >= 40 ? neu : voll, anhaenge: (m.attachments ?? []).map((a) => a.filename),
        vonUns: m.from ? isTeamAddress(m.from.email) : false,
      };
    }));
}

const tag = (d: Date) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

export interface Schritt { mail: Mail; zustand: Zustand; tokens: number; ms: number; belegeFehlen: string[] }

/** old state + one mail → new state; quotes are checked against the mail they claim to come from */
export async function fortschreiben(model: LanguageModel, zustand: Zustand | null, mail: Mail, alleTexte: Map<string, string>): Promise<Schritt> {
  const t0 = Date.now();
  const r = await generateText({
    model,
    instructions: ANWEISUNG,
    prompt: [
      `Bisheriger Stand:\n${zustand ? JSON.stringify(zustand, null, 1) : '(Gespräch beginnt)'}`,
      '',
      `Nächste Mail (${tag(mail.am)}${mail.vonUns ? ', vom StartHub-Team' : ''}):`,
      `Von: ${mail.von ? `${mail.von.name ?? ''} <${mail.von.email}>` : '–'}`,
      `An: ${mail.an.join(', ') || '–'}`,
      `Betreff: ${mail.betreff ?? '–'}`,
      mail.anhaenge.length ? `Anhänge: ${mail.anhaenge.join(', ')}` : 'Anhänge: keine',
      '',
      mail.text.slice(0, 6000),
    ].join('\n'),
    output: Output.object({ schema: Zustand }),
    maxRetries: 2,
  });
  const neu = Zustand.parse(r.output);
  // every quote must stand in one of the mails so far – otherwise it is marked, not hidden
  const texte = [...alleTexte.values()].map(vergleichbar);
  const steht = (z: string | null) => !z || texte.some((t) => t.includes(vergleichbar(z)));
  const belegeFehlen = [
    ...neu.punkte.flatMap((p) => [p.beleg, p.erledigt_beleg]).filter((z) => !steht(z)),
    ...neu.aussagen.map((a) => a.beleg).filter((z) => !steht(z)),
  ].filter((z): z is string => !!z);
  return { mail, zustand: neu, tokens: (r.totalUsage.inputTokens ?? 0) + (r.totalUsage.outputTokens ?? 0), ms: Date.now() - t0, belegeFehlen };
}

export async function gespraechDurchgehen(model: LanguageModel, threadKey: string): Promise<Schritt[]> {
  const mails = await mailsVon(threadKey);
  const texte = new Map<string, string>();
  const schritte: Schritt[] = [];
  let zustand: Zustand | null = null;
  for (const m of mails) {
    texte.set(m.id, m.text);
    const s = await fortschreiben(model, zustand, m, texte);
    zustand = s.zustand;
    schritte.push(s);
  }
  return schritte;
}

const ART = { aufgabe: 'Aufgabe (wir)', erwartung: 'Erwartung (sie)', bitte_an_uns: 'Bitte an uns' } as const;
const BALL = { uns: 'bei uns', sie: 'bei ihnen', niemand: 'bei niemandem', abgeschlossen: 'abgeschlossen' } as const;

/** the comparison as text: today's tasks, the course of the state, the final state */
export function bericht(v: Verlauf, schritte: Schritt[]): string {
  const z = schritte.at(-1)?.zustand;
  const zeilen: string[] = [];
  zeilen.push(`\n════════ ${v.betreff} ════════`);
  zeilen.push(`${schritte.length} Mails · heute daraus ${v.aufgaben.length} Aufgaben/Zusagen`);
  zeilen.push('\nHEUTE (bisherige Verarbeitung):');
  for (const a of v.aufgaben) zeilen.push(`  - [${a.direction === 'ours' ? 'wir' : 'sie'}${a.status === 'done' ? ', erledigt' : ''}] ${a.title}${a.due_at ? ` (bis ${tag(new Date(a.due_at))})` : ''}`);
  zeilen.push('\nVERLAUF DES ZUSTANDS (Mail für Mail):');
  for (const s of schritte) {
    zeilen.push(`  ${tag(s.mail.am)} ${s.mail.vonUns ? 'wir   ' : 'extern'} → Ball ${BALL[s.zustand.ball]}; offen: ${s.zustand.punkte.filter((p) => p.status === 'offen').length}${s.belegeFehlen.length ? `; ${s.belegeFehlen.length} Zitat(e) nicht gefunden` : ''}`);
  }
  if (z) {
    zeilen.push('\nNEU – STAND AM ENDE:');
    zeilen.push(`  Ball: ${BALL[z.ball]}`);
    zeilen.push(`  Nächster Schritt: ${z.naechster_schritt ?? '–'}`);
    zeilen.push(`  Worum es geht: ${z.zusammenfassung}`);
    zeilen.push('  Punkte:');
    for (const p of z.punkte) {
      zeilen.push(`    - [${ART[p.art]}, ${p.status}] ${p.text}${p.wer ? ` – ${p.wer}` : ''}${p.bis ? ` (bis ${p.bis})` : ''}`);
      zeilen.push(`        Beleg: „${p.beleg.slice(0, 140)}“`);
      if (p.erledigt_beleg) zeilen.push(`        erledigt durch: „${p.erledigt_beleg.slice(0, 140)}“`);
    }
    if (z.aussagen.length) {
      zeilen.push('  Aussagen über Personen:');
      for (const a of z.aussagen) zeilen.push(`    - ${a.wer}: ${a.was} [${a.art}] – „${a.beleg.slice(0, 100)}“`);
    }
  }
  const tokens = schritte.reduce((s, x) => s + x.tokens, 0);
  const ms = schritte.reduce((s, x) => s + x.ms, 0);
  zeilen.push(`\n  (${tokens} Tokens, ${(ms / 1000).toFixed(1)} s)`);
  return zeilen.join('\n');
}
