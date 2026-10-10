// Web search about new contacts (decision 10.10.2026: automatic for new contacts). Kollege asks
// Mistral's built-in web search for the professional context of a person: organisation, kind,
// function – nothing private. Only name, mail domain and a known organisation leave the house,
// never mail content; the conversation is not stored at Mistral (store: false).
// Guards in code: the person must clearly match (else "unklar"), every source must be a page the
// search actually returned, an organisation is set only where none is known – as a guess with sources.
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { runAction } from '@/lib/actions';
import { withSystem } from '@/lib/db/client';
import { logCall, MISTRAL_EU } from '@/lib/model/models';
import { eigeneDomain, orgFuer, type OrgRolle } from './organisation';

const SYSTEM = { type: 'system' } as const;
const PRO_LAUF = 10;

export interface WebStand {
  am: string;
  status: 'gefunden' | 'unklar' | 'fehler';
  organisation?: string | null;
  art?: OrgRolle | null;
  funktion?: string | null;
  quellen?: { url: string; titel: string | null }[];
  fehler?: string;
}

const Antwort = z.object({
  passt: z.boolean(),
  organisation: z.string().nullable(),
  art: z.enum(['university', 'partner', 'founding_team', 'other']).nullable(),
  funktion: z.string().nullable(),
  quellen: z.array(z.string()).max(5),
});

/** the model for the search; null = web search off (WEBSUCHE=an and a Mistral model needed) */
export function webModell(): string | null {
  if (process.env.WEBSUCHE !== 'an' || !process.env.MISTRAL_API_KEY) return null;
  const spec = process.env.MODEL_WEB || process.env.MODEL_THINK || '';
  return spec.startsWith('mistral:') ? spec.slice('mistral:'.length) : null;
}

export interface Suchergebnis { text: string; quellen: { url: string; titel: string | null }[]; tokens?: { ein?: number; aus?: number } }

/** one question to Mistral with the web_search tool (Conversations API) */
export async function webFrage(frage: string, anweisung: string, modell: string): Promise<Suchergebnis> {
  const base = process.env.MISTRAL_BASE_URL || MISTRAL_EU;
  const res = await fetch(`${base}/conversations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    body: JSON.stringify({ model: modell, instructions: anweisung, inputs: frage, tools: [{ type: 'web_search' }], store: false, stream: false }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as { outputs?: { type: string; content?: unknown }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  let text = '';
  const quellen = new Map<string, string | null>();
  for (const o of d.outputs ?? []) {
    if (o.type !== 'message.output') continue;
    if (typeof o.content === 'string') { text += o.content; continue; }
    for (const c of (o.content as { type: string; text?: string; url?: string; title?: string }[]) ?? []) {
      if (c.type === 'text' && c.text) text += c.text;
      if (c.type === 'tool_reference' && c.url) quellen.set(c.url, c.title ?? null);
    }
  }
  return { text, quellen: [...quellen].map(([url, titel]) => ({ url, titel })), tokens: { ein: d.usage?.prompt_tokens, aus: d.usage?.completion_tokens } };
}

const ANWEISUNG = `Du recherchierst für das Gründungszentrum der Universität Augsburg den beruflichen Kontext einer Kontaktperson.
Suche im Web nur nach dienstlichen Angaben: Organisation (Arbeitgeber, Hochschule, Unternehmen, Startup) und Funktion.
Nichts Privates (Wohnort, Familie, Alter, Privatleben).
Die Person muss eindeutig passen: Name UND Mail-Domain bzw. bekannte Organisation müssen zum Treffer passen. Bei Zweifel oder mehreren möglichen Personen: passt = false.
Antworte am Ende ausschließlich mit einem JSON-Objekt:
{"passt": true|false, "organisation": "Name der Organisation oder null", "art": "university"|"partner"|"founding_team"|"other"|null, "funktion": "Funktion/Rolle oder null", "quellen": ["URL", …]}
"art": university = Hochschule oder Forschungseinrichtung; founding_team = Startup/Gründungsteam; partner = Unternehmen, Kammer, Förderer, Netzwerk; sonst other.
Nenne in "quellen" nur Seiten, die du in der Suche gefunden hast.`;

const norm = (u: string) => u.replace(/[#?].*$/, '').replace(/\/$/, '').toLowerCase();

/** the answer, held against what the search returned; null fields when it does not hold */
export function auswerten(e: Suchergebnis): Omit<WebStand, 'am'> {
  const roh = /\{[\s\S]*\}/.exec(e.text)?.[0];
  let a: z.infer<typeof Antwort>;
  try {
    a = Antwort.parse(JSON.parse(roh ?? ''));
  } catch {
    return { status: 'unklar' };
  }
  const gefunden = new Map(e.quellen.map((q) => [norm(q.url), q]));
  const quellen = a.quellen.flatMap((u) => { const q = gefunden.get(norm(u)); return q ? [q] : []; });
  if (!a.passt || !a.organisation?.trim() || !quellen.length) return { status: 'unklar', quellen };
  return { status: 'gefunden', organisation: a.organisation.trim(), art: a.art, funktion: a.funktion?.trim() || null, quellen };
}

type Kandidat = { id: string; name: string; org_id: string | null; org: string | null; role: string; emails: string[] };

/** people to look up: never searched, or the last attempt failed a day ago; a full name and an address */
async function kandidaten(limit: number, nurId?: string): Promise<Kandidat[]> {
  return withSystem(async (tx) => (await tx.execute<Kandidat>(sql`
    SELECT p.id, p.name, p.org_id, o.name AS org, p.role::text AS role,
           ARRAY(SELECT pe.email FROM person_emails pe WHERE pe.person_id = p.id ORDER BY pe.email) AS emails
    FROM people p LEFT JOIN orgs o ON o.id = p.org_id
    WHERE p.review_state <> 'discarded' AND p.merged_into_id IS NULL AND p.name ~ '\\S+\\s+\\S+'
      AND (p.web IS NULL OR (p.web->>'status' = 'fehler' AND (p.web->>'am')::timestamptz < now() - interval '1 day'))
      AND (${nurId ?? null}::uuid IS NULL OR p.id = ${nurId ?? null}::uuid)
    ORDER BY p.created_at DESC LIMIT ${limit}`)).rows);
}

const PERSON_ROLLE: Partial<Record<OrgRolle, 'university' | 'partner' | 'founder'>> = { university: 'university', partner: 'partner', founding_team: 'founder' };

/** look up one person and apply what holds */
export async function anreichern(k: Kandidat, modell: string): Promise<WebStand> {
  const domains = [...new Set(k.emails.map((e) => e.slice(e.lastIndexOf('@') + 1)))];
  const frage = `Person: ${k.name}\nMail-Domain: ${domains.join(', ')}${k.org ? `\nBekannte Organisation: ${k.org}` : ''}`;
  const started = Date.now();
  let stand: WebStand;
  try {
    const e = await webFrage(frage, ANWEISUNG, modell);
    await logCall({ role: 'think', model: `mistral:${modell}`, purpose: 'websuche', durationMs: Date.now() - started, inputTokens: e.tokens?.ein, outputTokens: e.tokens?.aus });
    stand = { am: new Date().toISOString(), ...auswerten(e) };
  } catch (err) {
    const fehler = err instanceof Error ? err.message.slice(0, 300) : String(err);
    await logCall({ role: 'think', model: `mistral:${modell}`, purpose: 'websuche', durationMs: Date.now() - started, error: fehler });
    stand = { am: new Date().toISOString(), status: 'fehler', fehler };
  }
  await withSystem(async (tx) => {
    const reason = stand.quellen?.length ? `Websuche: ${stand.quellen.map((q) => q.url).join(' · ')}` : 'Websuche';
    await runAction(SYSTEM, 'person.web', { id: k.id, web: stand }, { tx, reason });
    if (stand.status !== 'gefunden') return;
    // only where nothing is known: what a person or the mail said wins over the web
    if (!k.org_id) {
      const email = k.emails.find((e) => eigeneDomain(e)) ?? k.emails[0];
      const org = await orgFuer(tx, { email, name: stand.organisation, rolle: stand.art ?? 'other', reason });
      if (org) await runAction(SYSTEM, 'person.update', { id: k.id, org_id: org }, { tx, reason });
    }
    const rolle = stand.art ? PERSON_ROLLE[stand.art] : undefined;
    if (k.role === 'other' && rolle) await runAction(SYSTEM, 'person.update', { id: k.id, role: rolle }, { tx, reason });
  });
  return stand;
}

export interface AnreichernLauf { gesucht: number; gefunden: number; unklar: number; fehler: number }

/** one run (worker every few minutes, or npm run kontakte:anreichern): a few people at a time */
export async function anreichernLauf(opts: { limit?: number; personId?: string } = {}): Promise<AnreichernLauf> {
  const modell = webModell();
  const lauf: AnreichernLauf = { gesucht: 0, gefunden: 0, unklar: 0, fehler: 0 };
  if (!modell) return lauf;
  for (const k of await kandidaten(opts.limit ?? PRO_LAUF, opts.personId)) {
    const s = await anreichern(k, modell);
    lauf.gesucht++;
    lauf[s.status === 'gefunden' ? 'gefunden' : s.status]++;
  }
  return lauf;
}
