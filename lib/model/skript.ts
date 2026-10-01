// "skript": a deterministic stand-in for the role think, for tests and development without
// an API key (like the oracle for fast in stage 1). It only understands the stage-3
// acceptance sentences and works strictly through the same tools as a real model:
// search → read → act → answer with citations. It proves the wiring, not the judgement.
import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4Prompt, LanguageModelV4StreamPart } from '@ai-sdk/provider';

type Json = Record<string, unknown>;
type Schritt = { text: string } | { calls: { name: string; input: Json }[] };

const WOCHENTAGE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];

/** the next given weekday from today (today counts) as YYYY-MM-DD */
function naechster(heute: string, wochentag: string): string | null {
  const ziel = WOCHENTAGE.indexOf(wochentag.toLowerCase());
  if (ziel < 0) return null;
  const d = new Date(`${heute}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((ziel - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

function lage(prompt: LanguageModelV4Prompt) {
  const system = prompt.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  let last = -1;
  prompt.forEach((m, i) => { if (m.role === 'user') last = i; });
  const user = last < 0 ? '' : (prompt[last]!.content as { type: string; text?: string }[]).filter((p) => p.type === 'text').map((p) => p.text).join(' ');
  // tool results of this turn, by tool name (newest last)
  const ergebnisse: Record<string, Json[]> = {};
  for (const m of prompt.slice(last + 1)) {
    if (m.role !== 'tool') continue;
    for (const p of m.content) {
      if (p.type !== 'tool-result' || p.output.type !== 'json') continue;
      (ergebnisse[p.toolName] ??= []).push(p.output.value as Json);
    }
  }
  return {
    user: user.trim(),
    heute: /Heute: \S+, (\d{4}-\d{2}-\d{2})/.exec(system)?.[1] ?? new Date().toISOString().slice(0, 10),
    ich: /Du schreibst mit: .*? \(ID ([0-9a-f-]{36})\)/.exec(system)?.[1] ?? null,
    ergebnisse,
  };
}

const ersteOrg = (r?: Json[]) => ((r?.at(-1)?.orgs as Json[] | undefined) ?? [])[0] as { id: string; name: string } | undefined;

function schritt(prompt: LanguageModelV4Prompt): Schritt {
  const { user, heute, ich, ergebnisse } = lage(prompt);

  // "Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber"
  const gespraech = /(Beratung|Telefonat|Treffen) mit ([^,.]+)/i.exec(user);
  if (gespraech) {
    const [, art, mit] = gespraech;
    const name = mit!.trim();
    if (!ergebnisse.search) return { calls: [{ name: 'search', input: { query: name, types: ['org'] } }] };
    const org = ersteOrg(ergebnisse.search);
    if (!org) return { text: `Wen meinst du mit ${name}? Ich finde keine Organisation dieses Namens. Neu anlegen oder anderer Name?` };
    if (!ergebnisse.note_create) {
      return { calls: [{ name: 'note_create', input: {
        payload: { target_type: 'org', target_id: org.id, body_text: user, conversation: { art: art![0]!.toUpperCase() + art!.slice(1).toLowerCase(), mit: org.name } },
        begruendung: user,
      } }] };
    }
    const note = ergebnisse.note_create.at(-1) as { ok: boolean; id?: string; error?: string };
    if (!note.ok) return { text: `Die Notiz ging nicht: ${note.error}` };
    if (!ergebnisse.task_create) {
      const calls: { name: string; input: Json }[] = [];
      for (const teil of user.split(/,|\bund\b/).map((t) => t.trim())) {
        const frist = /^(.+?) bis (\w+)$/i.exec(teil);
        const wir = /^wir (\w+) (.+)$/i.exec(teil);
        if (frist && !/^wir /i.test(teil)) {
          const due = naechster(heute, frist[2]!);
          calls.push({ name: 'task_create', input: {
            payload: { title: frist[1]!, direction: 'theirs', org_id: org.id, source_entry_id: note.id, ...(due ? { due_date: due } : {}) },
            begruendung: teil,
          } });
        } else if (wir && ich) {
          calls.push({ name: 'task_create', input: {
            payload: { title: `${wir[2]} ${wir[1]}`, direction: 'ours', owner_user_id: ich, org_id: org.id, source_entry_id: note.id },
            begruendung: teil,
          } });
        }
      }
      if (calls.length) return { calls };
    }
    return { text: 'Notiert.' };
  }

  // "Was haben wir Solaro versprochen?"
  const versprochen = /was haben wir (.+?) (versprochen|zugesagt)/i.exec(user);
  if (versprochen) {
    const name = versprochen[1]!.trim();
    if (!ergebnisse.search) return { calls: [{ name: 'search', input: { query: name, types: ['org'] } }] };
    const org = ersteOrg(ergebnisse.search);
    if (!org) return { text: `Ich finde keine Organisation „${name}“.` };
    if (!ergebnisse.get_contact) return { calls: [{ name: 'get_contact', input: { type: 'org', id: org.id } }] };
    const c = ergebnisse.get_contact.at(-1) as { commitments?: { we_owe: { title: string; due: string | null; status: string; source_id: string }[] } };
    const offen = (c.commitments?.we_owe ?? []).filter((t) => t.status !== 'done');
    if (!offen.length) return { text: `Offen ist gegenüber ${org.name} nichts, was wir zugesagt haben.` };
    const datum = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
    return { text: [`Gegenüber ${org.name} haben wir zugesagt:`, ...offen.map((t) => `- ${t.title}${t.due ? ` (bis ${datum(t.due)})` : ''} [[${t.source_id}]]`)].join('\n') };
  }

  // "Ab jetzt …" → instruction
  const anweisung = /^ab jetzt[:,]?\s*(.+)$/i.exec(user);
  if (anweisung) {
    if (!ergebnisse.instruction_create) {
      return { calls: [{ name: 'instruction_create', input: { payload: { body_text: anweisung[1]!, scope: /\bmir\b|\bich\b|\bmich\b/i.test(anweisung[1]!) ? 'personal' : 'team' } } }] };
    }
    return { text: 'Gemerkt.' };
  }

  return { text: 'Dazu habe ich noch zu wenig Erfahrung. (Testmodell: es versteht nur die Abnahme-Sätze.)' };
}

const usage = { inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 0, text: 0, reasoning: undefined } };

function teile(s: Schritt): LanguageModelV4StreamPart[] {
  if ('text' in s) {
    return [
      { type: 'stream-start', warnings: [] },
      { type: 'text-start', id: 't' },
      ...s.text.split(/(?<= )/).map((delta): LanguageModelV4StreamPart => ({ type: 'text-delta', id: 't', delta })),
      { type: 'text-end', id: 't' },
      { type: 'finish', usage, finishReason: { unified: 'stop', raw: undefined } },
    ];
  }
  return [
    { type: 'stream-start', warnings: [] },
    ...s.calls.map((c, i): LanguageModelV4StreamPart => ({ type: 'tool-call', toolCallId: `skript-${Date.now()}-${i}`, toolName: c.name, input: JSON.stringify(c.input) })),
    { type: 'finish', usage, finishReason: { unified: 'tool-calls', raw: undefined } },
  ];
}

export function skriptModell(): LanguageModelV4 {
  return {
    specificationVersion: 'v4',
    provider: 'kollege',
    modelId: 'skript',
    supportedUrls: {},
    async doGenerate() {
      throw new Error('skript: only streaming');
    },
    async doStream(o: LanguageModelV4CallOptions) {
      const parts = teile(schritt(o.prompt));
      return { stream: new ReadableStream({ start(c) { for (const p of parts) c.enqueue(p); c.close(); } }) };
    },
  };
}
