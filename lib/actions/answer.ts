// Answering a hint ("Kurz klären"): run the action behind the chosen button as the user,
// then resolve the hint as a follow-up step – one undo reverts both.
import { eq, sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';
import { hints } from '@/lib/db/schema';
import type { HintOption } from './hint';
import { runAction } from './run';
import { ActionError } from './types';

export async function answerHint(userId: string, hintId: string, optionIndex: number): Promise<{ actionId: string }> {
  return withUser(userId, async (tx) => {
    const [hint] = await tx.select().from(hints).where(eq(hints.id, hintId));
    if (!hint) throw new ActionError(`hint ${hintId} not found`);
    if (hint.status !== 'open') throw new ActionError('hint is no longer open');
    const option = (hint.options as HintOption[])[optionIndex];
    if (!option) throw new ActionError(`hint has no option ${optionIndex}`);

    const actor = { type: 'user' as const, userId };
    const { actionId } = await runAction(actor, option.action_type, option.payload, { tx });
    if (option.action_type !== 'hint.dismiss' && option.action_type !== 'hint.resolve') {
      await runAction(actor, 'hint.resolve', { hint_id: hintId }, { tx, parentActionId: actionId });
    }
    return { actionId };
  });
}

/**
 * A moment answered in words (§10): "Was kam raus?" becomes a note on what the event belongs to
 * (topic, else organisation, else person), "Wie lief's?" the outcome note of the topic.
 * The hint is resolved as a follow-up step – one undo reverts both.
 */
export async function answerHintText(userId: string, hintId: string, text: string): Promise<{ actionId: string }> {
  const body = text.trim();
  if (!body) throw new ActionError('Bitte kurz etwas eintragen.');
  return withUser(userId, async (tx) => {
    const [hint] = await tx.select().from(hints).where(eq(hints.id, hintId));
    if (!hint) throw new ActionError(`hint ${hintId} not found`);
    if (hint.status !== 'open') throw new ActionError('hint is no longer open');
    const actor = { type: 'user' as const, userId };
    let actionId: string;
    if (hint.kind === 'outcome' && hint.target_type === 'matter' && hint.target_id) {
      ({ actionId } = await runAction(actor, 'matter.update', { id: hint.target_id, outcome_note: body }, { tx }));
    } else if (hint.kind === 'after_event' && hint.target_type === 'entry' && hint.target_id) {
      const r = await tx.execute<{ target_type: 'matter' | 'org' | 'person'; target_id: string; title: string | null; ende: string | null }>(sql`
        SELECT l.target_type, l.target_id, e.title, e.meta->>'end' AS ende FROM links l JOIN entries e ON e.id = l.entry_id
        WHERE l.entry_id = ${hint.target_id} AND l.target_type IN ('matter', 'org', 'person')
        ORDER BY CASE l.target_type WHEN 'matter' THEN 0 WHEN 'org' THEN 1 ELSE 2 END LIMIT 1`);
      const ziel = r.rows[0];
      if (!ziel) throw new ActionError('Der Termin ist noch nichts zugeordnet – bitte erst zuordnen.');
      ({ actionId } = await runAction(actor, 'note.create', {
        target_type: ziel.target_type, target_id: ziel.target_id, body_text: body, title: `Nach: ${ziel.title ?? 'Termin'}`,
        ...(ziel.ende ? { occurred_at: new Date(ziel.ende).toISOString() } : {}), conversation: { art: 'Treffen', mit: '' },
      }, { tx }));
    } else {
      throw new ActionError('Auf diesen Hinweis antwortet man mit den Knöpfen.');
    }
    await runAction(actor, 'hint.resolve', { hint_id: hintId }, { tx, parentActionId: actionId });
    return { actionId };
  });
}
