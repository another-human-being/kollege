'use server';
// The only way the interface changes data: runAction as the signed-in user (actor 'user').
// Rights are checked by the action layer and RLS – not here.
import { refresh } from 'next/cache';
import { ZodError } from 'zod';
import { currentUserId } from '@/auth';
import { ActionError, answerHint, answerHintText, runAction, undoAction } from '@/lib/actions';
import { ZURUECKHOLBAR_S } from '@/lib/actions/mail';
import { einreihen } from '@/lib/jobs/queue';
import { entwurfVorlage, erinnerungVorlage } from '@/lib/mail/vorlage';
import { putBlob } from '@/lib/pipeline/blobs';
import { addDays, berlinInstant } from '@/lib/time';
import { chatTitel } from '@/lib/views/chats';

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
  [/no recipient/, 'Empfänger fehlt – an wen soll die Mail gehen?'],
  [/mail is being sent/, 'Die Mail wird gerade gesendet.'],
  [/mailbox not found or not yours/, 'Aus diesem Postfach kannst du nicht senden.'],
  [/no copy of this mail in your mailbox/, 'Diese Mail liegt nicht in deinem Postfach.'],
  [/not in your inbox/, 'Liegt nicht mehr im Eingang.'],
  [/no calendar connected/, 'Es ist kein Kalender verbunden.'],
  [/end before start/, 'Das Ende liegt vor dem Beginn.'],
  [/only coming events can be sent/, 'Für vergangene Termine geht keine Einladung mehr raus.'],
  [/only coming events/, 'Absagen gibt es nur für kommende Termine.'],
  [/read only/, 'Termin von jemand anderem – nur lesbar.'],
  [/nothing to send/, 'Es gibt nichts zu senden.'],
  [/being sent/, 'Wird gerade gesendet.'],
  [/Bitte kurz etwas eintragen/, 'Bitte kurz etwas eintragen.'],
  [/noch nichts zugeordnet/, 'Der Termin ist noch nichts zugeordnet – bitte erst zuordnen.'],
  [/no longer open/, 'Das ist schon erledigt.'],
  [/commitment not found/, 'Diese Zusage gibt es nicht mehr.'],
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

/** a moment answered in words: "Was kam raus?" → note, "Wie lief's?" → outcome note (stage 8) */
export async function hinweisText(hintId: string, text: string): Promise<Result> {
  try {
    const { actionId } = await answerHintText(await currentUserId(), hintId, text);
    refresh();
    return { ok: true, actionId };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** a new chat from the first input; the page then sends that input as first message */
export async function chatAnlegen(text: string, bezug?: { type: 'matter' | 'org' | 'person'; id: string }): Promise<Result> {
  return perform('chat.create', { title: chatTitel(text), ...(bezug ? { context_type: bezug.type, context_id: bezug.id } : {}) });
}

// --- Mail (stage 5) ------------------------------------------------------------------------

/** send: queue the mail, it goes out after ZURUECKHOLBAR_S unless undone (E43) */
export async function mailSenden(draftId: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    const { actionId, result } = await runAction<{ send_after: string }>({ type: 'user', userId }, 'mail.send', { id: draftId });
    // fast path; if it fails the worker picks the mail up within a minute (senden-nachholen)
    await einreihen('senden', { actionId }, { startAfter: ZURUECKHOLBAR_S }).catch((e: unknown) => console.error('[senden einreihen]', e));
    refresh();
    return { ok: true, actionId, result };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** a new draft, prefilled for a reply, reply to all or forward; returns its id */
export async function entwurfFuer(art: 'neu' | 'antwort' | 'allen' | 'weiterleitung', bezugId?: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    const payload = await entwurfVorlage(userId, art, bezugId);
    const { actionId, result } = await runAction({ type: 'user', userId }, 'mail.draft', payload);
    return { ok: true, actionId, result };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** "Jetzt erinnern" (E57): a reminder draft for a commitment of others, from a template */
export async function erinnerung(taskId: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    const payload = await erinnerungVorlage(userId, taskId);
    const { actionId, result } = await runAction({ type: 'user', userId }, 'mail.draft', payload);
    return { ok: true, actionId, result };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** an attachment for a draft: stored like every blob (content-addressed) */
export async function anhangHochladen(form: FormData): Promise<{ ok: true; anhang: { blob_path: string; filename: string; mime: string } } | { ok: false; error: string }> {
  try {
    await currentUserId();
    const f = form.get('datei');
    if (!(f instanceof File) || !f.size) return { ok: false, error: 'Keine Datei.' };
    if (f.size > 20 * 1024 * 1024) return { ok: false, error: 'Die Datei ist größer als 20 MB.' };
    const blob_path = await putBlob(Buffer.from(await f.arrayBuffer()));
    return { ok: true, anhang: { blob_path, filename: f.name, mime: f.type || 'application/octet-stream' } };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

// --- Kalender (stage 6) -------------------------------------------------------------------

/** "Einladung senden" / "Änderung senden" / cancel with invited people: out after 10 s unless undone */
export async function terminVersand(type: 'event.send' | 'event.cancel', id: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    const { actionId, result } = await runAction<{ art?: string }>({ type: 'user', userId }, type, { id });
    if (result.art) await einreihen('senden', { actionId }, { startAfter: ZURUECKHOLBAR_S }).catch((e: unknown) => console.error('[termin einreihen]', e));
    refresh();
    return { ok: true, actionId, result };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** a form in Berlin local time (CLAUDE.md: Europe/Berlin) – converted here, not in the browser */
export async function terminSpeichern(id: string | undefined, f: {
  title: string; datum: string; von: string; bisDatum: string; bis: string; allDay: boolean; location: string; notes: string; mit: string;
}): Promise<Result> {
  const start = berlinInstant(f.datum, f.allDay ? '00:00' : f.von);
  // all-day: the end is exclusive, the day after the last one (iCalendar)
  const end = f.allDay ? berlinInstant(addDays(f.bisDatum, 1), '00:00') : berlinInstant(f.bisDatum, f.bis);
  const teilnahme = f.mit.split(/[,;\s]+/).filter((x) => x.includes('@')).map((email) => ({ email }));
  const payload = { title: f.title, start, end, all_day: f.allDay, location: f.location || null, notes: f.notes || null, teilnahme };
  return id ? perform('event.update', { id, ...payload }) : perform('event.create', payload);
}
