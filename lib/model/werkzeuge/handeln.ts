// Acting tools (§9.1): every internal action of §6 that the actor "model" may run, generated
// from the registry – one tool per action, its Zod schema as input. External actions are
// left out here AND refused by runAction (hard rule, CLAUDE.md). Each call returns a card.
import { sql } from 'drizzle-orm';
import { tool, type ToolSet } from 'ai';
import { z, ZodError } from 'zod';
import { listActions, runAction } from '@/lib/actions';
import { withUser } from '@/lib/db/client';
import { folgenText, karteFuer, type Karte } from './karten';
import type { WerkzeugKontext } from './lesen';

/** chats are infrastructure; hints the model raises come in stage 8 (advice) */
const NICHT_FUER_MODELL = new Set(['chat.create', 'chat.update', 'chat.append', 'hint.create']);

const BESCHREIBUNG: Record<string, string> = {
  'note.create': 'Notiz oder Gesprächsnotiz (conversation: Beratung, Telefonat, Treffen …) an einem Eintrag, einer Organisation oder Person ablegen. Für alles, was jemand erzählt und bleiben soll.',
  'task.create': 'Aufgabe (direction ours: wir schulden es, owner_user_id aus dem Team) oder Zusage der anderen Seite (direction theirs: owner_person_id oder nur org_id). Frist als due_date (YYYY-MM-DD). source_entry_id = Notiz, aus der es stammt.',
  'instruction.create': 'Anweisung speichern („ab jetzt …“). scope personal (nur für mich), area (für einen Bereich, area_id) oder team.',
  'matter.create': 'Neuen Eintrag in einem Bereich anlegen (Event, Lehrveranstaltung, Beitrag, Thema eines Gründungsteams mit org_id).',
  'matter.update': 'Titel, Felder, Phase, Daten eines Eintrags ändern.',
  'entry.link': 'Einen Eintrag (Mail, Termin, Datei, Notiz) einem Eintrag, einer Organisation oder Person zuordnen.',
  'review.accept': 'Vom System angelegte, ungeprüfte Einträge übernehmen.',
  'review.discard': 'Ungeprüfte Einträge verwerfen, mit Grund.',
};

const toolName = (type: string) => type.replace('.', '_');

function fehler(e: unknown): string {
  if (e instanceof ZodError) return `Eingabe ungültig: ${e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`;
  const m = e instanceof Error ? `${e.message}${e.cause instanceof Error ? ` (${e.cause.message})` : ''}` : String(e);
  return m.slice(0, 300);
}

export function handelnwerkzeuge(k: WerkzeugKontext): ToolSet {
  const tools: ToolSet = {};
  for (const def of listActions()) {
    if (def.external || !def.allowedActors.includes('model') || NICHT_FUER_MODELL.has(def.type)) continue;
    tools[toolName(def.type)] = tool({
      description: `${BESCHREIBUNG[def.type] ?? `Aktion ${def.type}.`} Erzeugt eine Karte mit Rückgängig.`,
      inputSchema: z.object({
        payload: def.schema,
        begruendung: z.string().max(500).optional().describe('kurzer Beleg, woraus das folgt (Zitat aus der Eingabe)'),
        anweisungen: z.array(z.uuid()).optional().describe('IDs der Anweisungen, die du dabei angewendet hast'),
      }),
      execute: async ({ payload, begruendung, anweisungen }) => {
        try {
          const { actionId, result } = await runAction<Record<string, unknown>>(
            { type: 'model', userId: k.userId },
            def.type,
            payload,
            { chatId: k.chatId, reason: begruendung, appliedInstructionIds: anweisungen },
          );
          const karte: Karte = await withUser(k.userId, async (tx) => {
            const basis = await karteFuer(tx, def.type, payload as Record<string, unknown>, result ?? {}, k.now);
            const inv = await tx.execute<{ undoable: boolean }>(sql`SELECT inverse IS NOT NULL AS undoable FROM actions WHERE id = ${actionId}`);
            const angewandt = anweisungen?.length
              ? (await tx.execute<{ body_text: string }>(sql`
                  SELECT body_text FROM entries WHERE kind = 'instruction' AND id IN (${sql.join(anweisungen.map((a) => sql`${a}`), sql`, `)})`)).rows.map((r) => r.body_text)
              : [];
            return {
              ...basis,
              actionId,
              undoable: inv.rows[0]?.undoable === true,
              folgen: await folgenText(tx, actionId),
              ...(angewandt.length ? { anweisung: angewandt.join('“, „') } : {}),
            };
          });
          return { ok: true, id: result?.id ?? null, karte };
        } catch (e) {
          return { ok: false, error: fehler(e) };
        }
      },
    });
  }
  return tools;
}
