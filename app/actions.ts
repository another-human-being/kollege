'use server';
// The only way the interface changes data: runAction as the signed-in user (actor 'user').
// Rights are checked by the action layer and RLS – not here.
import { refresh } from 'next/cache';
import { ZodError } from 'zod';
import { currentUserId } from '@/auth';
import { ActionError, answerHint, runAction, undoAction } from '@/lib/actions';

export type Result = { ok: true; actionId: string; result?: unknown } | { ok: false; error: string };

const MESSAGES: [RegExp, string][] = [
  [/not found or not allowed|not found/, 'Das geht nicht: Eintrag nicht gefunden oder keine Berechtigung.'],
  [/hand over instead/, 'Jemand ist schon zuständig – das geht über „Übergeben an“.'],
  [/only the person responsible/, 'Übergeben kann nur, wer zuständig ist.'],
  [/already undone/, 'Das ist schon rückgängig gemacht.'],
  [/cannot be undone/, 'Das lässt sich nicht rückgängig machen.'],
  [/no field|no phase/, 'Dieses Feld gibt es in diesem Bereich nicht.'],
  [/freemail|team domain/, 'Diese Domain kann zu keiner Organisation gehören.'],
  [/only our own/, '„In Arbeit“ gibt es nur für eigene Aufgaben.'],
  [/nothing to change/, 'Nichts geändert.'],
];

function message(e: unknown): string {
  if (e instanceof ZodError) return 'Eingabe ungültig.';
  const text = e instanceof Error ? `${e.message} ${e.cause instanceof Error ? e.cause.message : ''}` : String(e);
  for (const [re, msg] of MESSAGES) if (re.test(text)) return msg;
  console.error('[action]', e);
  return e instanceof ActionError ? 'Das ging nicht.' : 'Das ging nicht – technischer Fehler.';
}

export async function perform(type: string, payload: unknown): Promise<Result> {
  try {
    const userId = await currentUserId();
    const { actionId, result } = await runAction({ type: 'user', userId }, type, payload);
    refresh();
    return { ok: true, actionId, result };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function undo(actionId: string): Promise<Result> {
  try {
    await undoAction(actionId, await currentUserId());
    refresh();
    return { ok: true, actionId };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function answer(hintId: string, optionIndex: number): Promise<Result> {
  try {
    const { actionId } = await answerHint(await currentUserId(), hintId, optionIndex);
    refresh();
    return { ok: true, actionId };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
