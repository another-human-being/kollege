// Answering a hint ("Kurz klären"): run the action behind the chosen button as the user,
// then resolve the hint as a follow-up step – one undo reverts both.
import { eq } from 'drizzle-orm';
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
