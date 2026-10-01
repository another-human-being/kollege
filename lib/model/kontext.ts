// Context for the chat (§9.1): today's date, who asks, team, areas, valid instructions
// (personal > area > team) and the page the chat belongs to. Loaded with the user's rights.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { berlinDate } from '@/lib/time';

let denkweise: string | undefined;
export function denkweisePrompt(): string {
  // process.cwd(): module-relative URLs break under Turbopack (see config.ts)
  denkweise ??= readFileSync(join(process.cwd(), 'lib/model/prompts/denkweise.md'), 'utf8');
  return denkweise;
}

export interface ChatBezug {
  type: 'matter' | 'org' | 'person';
  id: string;
}

export interface Anweisung {
  id: string;
  text: string;
  scope: 'personal' | 'area' | 'team';
  area: string | null;
}

export async function kontext(userId: string, now: Date, bezug?: ChatBezug | null) {
  return withUser(userId, async (tx) => {
    const team = (await tx.execute<{ id: string; name: string; email: string }>(sql`SELECT id, name, email FROM users ORDER BY name`)).rows;
    const areas = (await tx.execute<{ id: string; key: string; name_plural: string; matter_kind: string; phases: string[]; fields: { key: string; label: string; type: string }[] }>(sql`
      SELECT id, key, name_plural, matter_kind, phases, fields FROM areas ORDER BY sort`)).rows;
    const anweisungen = (await tx.execute<{ id: string; text: string; personal: boolean; area: string | null }>(sql`
      SELECT e.id, e.body_text AS text, e.instruction_user_id IS NOT NULL AS personal, a.name_plural AS area
      FROM entries e LEFT JOIN areas a ON a.id = e.instruction_area_id
      WHERE e.kind = 'instruction'
      ORDER BY (e.instruction_user_id IS NOT NULL) DESC, (e.instruction_area_id IS NOT NULL) DESC, e.occurred_at`)).rows
      .map((a): Anweisung => ({ id: a.id, text: a.text, scope: a.personal ? 'personal' : a.area ? 'area' : 'team', area: a.area }));

    let seite: string | null = null;
    if (bezug) {
      const q = {
        matter: sql`SELECT m.title AS name, a.name_singular AS art FROM matters m JOIN areas a ON a.id = m.area_id WHERE m.id = ${bezug.id}`,
        org: sql`SELECT name, 'Organisation' AS art FROM orgs WHERE id = ${bezug.id}`,
        person: sql`SELECT name, 'Person' AS art FROM people WHERE id = ${bezug.id}`,
      }[bezug.type];
      const r = (await tx.execute<{ name: string; art: string }>(q)).rows[0];
      if (r) seite = `${r.art} „${r.name}“ (type ${bezug.type}, ID ${bezug.id})`;
    }

    const me = team.find((u) => u.id === userId);
    const wochentag = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long' }).format(now);
    const text = [
      `Heute: ${wochentag}, ${berlinDate(now)} (Europe/Berlin).`,
      `Du schreibst mit: ${me?.name ?? '?'} (ID ${userId}).`,
      `Team: ${team.map((u) => `${u.name} (ID ${u.id})`).join(', ')}.`,
      'Bereiche:',
      ...areas.map((a) => `- ${a.name_plural}: key ${a.key}, ID ${a.id}${a.matter_kind === 'org_based' ? ', Liste der Gründungsteams (Organisationen), Themen als Einträge mit org_id' : ''}${a.phases.length ? `, Phasen ${a.phases.join(' / ')}` : ''}${a.fields.length ? `, Felder ${a.fields.map((f) => `${f.key} (${f.label}, ${f.type})`).join(', ')}` : ''}`),
      anweisungen.length ? 'Anweisungen (persönlich vor Bereich vor Team):' : 'Anweisungen: keine.',
      ...anweisungen.map((a) => `- [${a.id}] ${a.scope === 'personal' ? 'persönlich' : a.scope === 'area' ? `Bereich ${a.area}` : 'Team'}: „${a.text}“`),
      seite ? `Der Chat gehört zu: ${seite}. Fragen und Notizen ohne anderen Bezug meinen das.` : '',
    ].filter(Boolean).join('\n');
    return { text, anweisungen };
  });
}
