// Hinweise (§10, stage 8): SQL rules, daily at 06:30 and after every sync. Each rule yields the
// causes that hold now; a hint is created once per cause (dedupe_key, decision 40) and closes
// itself when its cause is gone. Heute shows the same causes live; the hint row is their memory:
// it appeared, it was put off ("Später"), it was done.
// All writes go through runAction (actor system).
import { sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import type { HintOption } from '@/lib/actions/hint';
import { isTeamAddress } from '@/lib/config';
import { withSystem } from '@/lib/db/client';
import { STALE_DAYS } from '@/lib/views/areas';
import { schluessel } from './schluessel';

const SYSTEM = { type: 'system' } as const;

export type RegelArt = 'overdue' | 'waiting' | 'stale' | 'handover' | 'after_event' | 'outcome';

export interface Ursache {
  kind: RegelArt;
  dedupe_key: string;
  user_id: string | null;
  text: string;
  reason: string;
  area_id: string | null;
  target_type: 'matter' | 'person' | 'org' | 'entry' | 'task';
  target_id: string;
  /** options that refer to the hint itself get its id when it is created */
  options?: (id: string) => HintOption[];
}

const ddmm = (d: Date | string) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' }).format(new Date(d));
const dt = (v: unknown) => new Date(v as string);

/** everything that holds now (§10 table) */
export async function ursachen(now: Date): Promise<Ursache[]> {
  return withSystem(async (tx) => {
    const out: Ursache[] = [];

    // overdue: our task past its due date
    const ueber = await tx.execute<{ id: string; title: string; due_at: string; owner_user_id: string | null; matter_id: string | null; area_id: string | null }>(sql`
      SELECT t.id, t.title, t.due_at, t.owner_user_id, t.matter_id, m.area_id
      FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id
      WHERE t.direction = 'ours' AND t.status <> 'done' AND t.due_at < ${now}`);
    for (const t of ueber.rows) {
      out.push({ kind: 'overdue', dedupe_key: schluessel.overdue(t.id, dt(t.due_at)), user_id: t.owner_user_id, area_id: t.area_id,
        text: `„${t.title}“ ist überfällig.`, reason: `fällig am ${ddmm(t.due_at)}`, target_type: 'task', target_id: t.id });
    }

    // waiting (a): a commitment of theirs past its date – for whoever looks after the topic or organisation
    const ihre = await tx.execute<{ id: string; title: string; due_at: string; wer: string | null; user_id: string | null; area_id: string | null }>(sql`
      SELECT t.id, t.title, t.due_at, coalesce(p.name, o.name) AS wer, coalesce(m.owner_user_id, o.owner_user_id) AS user_id, m.area_id
      FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id LEFT JOIN people p ON p.id = t.owner_person_id
      LEFT JOIN orgs o ON o.id = coalesce(t.org_id, p.org_id)
      WHERE t.direction = 'theirs' AND t.status <> 'done' AND t.due_at < ${now}`);
    for (const t of ihre.rows) {
      out.push({ kind: 'waiting', dedupe_key: schluessel.zusage(t.id, dt(t.due_at)), user_id: t.user_id, area_id: t.area_id,
        text: `${t.wer ?? 'Jemand'} hat „${t.title}“ noch nicht geliefert.`, reason: `zugesagt bis ${ddmm(t.due_at)}`, target_type: 'task', target_id: t.id });
    }

    // waiting (b): the last mail of a thread came from outside and is two working days old ("wartet auf uns", §8.2)
    const mails = await tx.execute<{ id: string; title: string | null; occurred_at: string; von: string | null; visibility: string; visible_to: string[]; area_id: string | null; matter_id: string | null }>(sql`
      SELECT e.id, e.title, e.occurred_at, coalesce(e.meta->'from'->>'name', e.meta->'from'->>'email') AS von, e.visibility, e.visible_to,
             (SELECT m.area_id FROM links l JOIN matters m ON m.id = l.target_id WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) AS area_id,
             (SELECT l.target_id FROM links l WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) AS matter_id
      FROM (SELECT DISTINCT ON (thread_key) * FROM entries
            WHERE kind = 'mail' AND thread_key IS NOT NULL AND processing_state <> 'skipped'
            ORDER BY thread_key, occurred_at DESC) e
      WHERE e.author_user_id IS NULL AND e.processing_state = 'done'
        AND workdays_between((e.occurred_at AT TIME ZONE 'Europe/Berlin')::date, (${now}::timestamptz AT TIME ZONE 'Europe/Berlin')::date) >= 2`);
    for (const m of mails.rows) {
      // a restricted mail: a hint for each person who may read it (the subject is theirs to see)
      for (const u of m.visibility === 'team' ? [null] : m.visible_to) {
        out.push({ kind: 'waiting', dedupe_key: schluessel.mail(m.id, u), user_id: u, area_id: m.area_id,
          text: `${m.von ?? 'Jemand'} wartet auf Antwort.`, reason: `„${m.title ?? '(ohne Betreff)'}“ – Mail vom ${ddmm(m.occurred_at)}`, target_type: 'entry', target_id: m.id });
      }
    }

    // stale: an open topic of someone without movement for STALE_DAYS (unowned ones are in "Im Team")
    const stale = await tx.execute<{ id: string; title: string; owner_user_id: string; area_id: string; last_at: string }>(sql`
      SELECT m.id, m.title, m.owner_user_id, m.area_id, coalesce(max(e.occurred_at), m.created_at) AS last_at
      FROM matters m LEFT JOIN links l ON l.target_type = 'matter' AND l.target_id = m.id LEFT JOIN entries e ON e.id = l.entry_id
      WHERE m.status = 'open' AND m.review_state <> 'discarded' AND m.owner_user_id IS NOT NULL
      GROUP BY m.id
      HAVING coalesce(max(e.occurred_at), m.created_at) < ${new Date(now.getTime() - STALE_DAYS * 86_400_000)}`);
    for (const m of stale.rows) {
      out.push({ kind: 'stale', dedupe_key: schluessel.stale(m.id, dt(m.last_at)), user_id: m.owner_user_id, area_id: m.area_id,
        text: `„${m.title}“ hängt.`, reason: `seit ${ddmm(m.last_at)} nichts passiert`, target_type: 'matter', target_id: m.id });
    }

    // handover: to the recipient, with the state of things (Denkweise 7)
    const ueb = await tx.execute<{ id: string; title: string; area_id: string; to: string; von: string | null; schritt: string | null; offen: number; zuletzt: string | null; zuletzt_at: string | null }>(sql`
      SELECT m.id, m.title, m.area_id, m.handover_to AS to, u.name AS von,
             (SELECT t.title FROM tasks t WHERE t.matter_id = m.id AND t.direction = 'ours' AND t.status <> 'done' ORDER BY t.due_at NULLS LAST LIMIT 1) AS schritt,
             (SELECT count(*)::int FROM tasks t WHERE t.matter_id = m.id AND t.status <> 'done') AS offen,
             (SELECT e.title FROM links l JOIN entries e ON e.id = l.entry_id WHERE l.target_type = 'matter' AND l.target_id = m.id ORDER BY e.occurred_at DESC LIMIT 1) AS zuletzt,
             (SELECT e.occurred_at FROM links l JOIN entries e ON e.id = l.entry_id WHERE l.target_type = 'matter' AND l.target_id = m.id ORDER BY e.occurred_at DESC LIMIT 1) AS zuletzt_at
      FROM matters m LEFT JOIN users u ON u.id = m.owner_user_id
      WHERE m.handover_to IS NOT NULL`);
    for (const m of ueb.rows) {
      const stand = [
        `Nächster Schritt: ${m.schritt ?? 'keiner eingetragen'}`,
        `offene Zusagen: ${m.offen}`,
        m.zuletzt_at ? `zuletzt: ${m.zuletzt ?? 'Eintrag'} (${ddmm(m.zuletzt_at)})` : null,
      ].filter(Boolean).join(' · ');
      out.push({ kind: 'handover', dedupe_key: schluessel.handover(m.id, m.to), user_id: m.to, area_id: m.area_id,
        text: `${m.von ?? 'Jemand'} übergibt dir „${m.title}“.`, reason: stand, target_type: 'matter', target_id: m.id });
    }

    // after_event: an event with people from outside ended within the last day, nothing written since
    const termine = await tx.execute<{ id: string; title: string | null; start: string; ende: string; meta: Record<string, unknown>; user_id: string | null; area_id: string | null }>(sql`
      SELECT e.id, e.title, e.meta->>'start' AS start, e.meta->>'end' AS ende, e.meta,
             coalesce(e.author_user_id, CASE WHEN cardinality(e.visible_to) = 1 THEN e.visible_to[1] END) AS user_id,
             (SELECT m.area_id FROM links l JOIN matters m ON m.id = l.target_id WHERE l.entry_id = e.id AND l.target_type = 'matter' LIMIT 1) AS area_id
      FROM entries e
      WHERE e.kind = 'event' AND coalesce(e.meta->>'status', '') <> 'CANCELLED' AND e.meta->>'recurrence' IS NULL
        AND (e.meta->>'end')::timestamptz <= ${now} AND (e.meta->>'end')::timestamptz > ${new Date(now.getTime() - 86_400_000)}
        AND NOT ${nachher}`);
    for (const e of termine.rows) {
      const m = e.meta as { attendees?: unknown[]; teilnahme?: { email: string; name?: string }[] };
      const leute = m.teilnahme?.length ? m.teilnahme : (m.attendees ?? []).map((a) => ({ email: String(a), name: undefined }));
      const gaeste = leute.filter((p) => !isTeamAddress(p.email)).map((p) => p.name ?? p.email);
      if (!gaeste.length) continue;
      out.push({ kind: 'after_event', dedupe_key: schluessel.nachTermin(e.id, dt(e.start)), user_id: e.user_id, area_id: e.area_id,
        text: `Was kam bei „${e.title ?? 'dem Termin'}“ raus?`, reason: `Termin am ${ddmm(e.start)} mit ${gaeste.join(', ')}`, target_type: 'entry', target_id: e.id,
        options: (id) => [{ label: 'Nichts Neues', action_type: 'hint.dismiss', payload: { hint_id: id } }] });
    }

    // outcome: a topic set to done in the last 7 days without a note how it went
    const fertig = await tx.execute<{ id: string; title: string; owner_user_id: string | null; area_id: string; action_id: string; at: string }>(sql`
      SELECT m.id, m.title, m.owner_user_id, m.area_id, a.id AS action_id, a.created_at AS at
      FROM matters m
      JOIN LATERAL (SELECT id, created_at FROM actions WHERE type = 'matter.set_status' AND payload->>'id' = m.id::text
                    AND undone_at IS NULL ORDER BY created_at DESC LIMIT 1) a ON a.created_at > ${new Date(now.getTime() - 7 * 86_400_000)}
      WHERE m.status = 'done' AND coalesce(m.outcome_note, '') = ''`);
    for (const m of fertig.rows) {
      out.push({ kind: 'outcome', dedupe_key: schluessel.outcome(m.id, m.action_id), user_id: m.owner_user_id, area_id: m.area_id,
        text: `Wie lief „${m.title}“?`, reason: `seit ${ddmm(m.at)} erledigt, noch ohne Rückblick`, target_type: 'matter', target_id: m.id,
        options: (id) => [{ label: 'Später nicht nötig', action_type: 'hint.dismiss', payload: { hint_id: id } }] });
    }
    return out;
  });
}

/** something written after the event, about the same topic, organisation or person */
const nachher = sql`EXISTS (
  SELECT 1 FROM links le JOIN links lx ON lx.target_type = le.target_type AND lx.target_id = le.target_id
  JOIN entries x ON x.id = lx.entry_id
  WHERE le.entry_id = e.id AND x.id <> e.id AND x.kind IN ('mail', 'note', 'file')
    AND x.occurred_at >= (e.meta->>'end')::timestamptz)`;

/** open rule hints whose cause is gone; after_event and outcome by their own condition (their trigger is a window) */
async function erledigt(ursachenKeys: Set<string>): Promise<string[]> {
  return withSystem(async (tx) => {
    const offen = await tx.execute<{ id: string; kind: string; dedupe_key: string; weg: boolean }>(sql`
      SELECT h.id, h.kind, h.dedupe_key,
             CASE h.kind
               WHEN 'after_event' THEN EXISTS (SELECT 1 FROM entries e WHERE e.id = h.target_id
                                                AND (coalesce(e.meta->>'status', '') = 'CANCELLED' OR ${nachher}))
               WHEN 'outcome' THEN EXISTS (SELECT 1 FROM matters m WHERE m.id = h.target_id AND (m.status = 'open' OR coalesce(m.outcome_note, '') <> ''))
               ELSE false END AS weg
      FROM hints h
      WHERE h.status = 'open' AND h.kind IN ('overdue', 'waiting', 'stale', 'handover', 'after_event', 'outcome')`);
    return offen.rows
      .filter((h) => (h.kind === 'after_event' || h.kind === 'outcome' ? h.weg : !ursachenKeys.has(h.dedupe_key)))
      .map((h) => h.id);
  });
}

export interface Lauf { neu: number; erledigt: number }

/** one run: create what is new, close what is gone. Idempotent. */
export async function regelnAnwenden(now = new Date()): Promise<Lauf> {
  const alle = await ursachen(now);
  const keys = new Set(alle.map((u) => u.dedupe_key));
  // a cause gets its hint once – also when it was put off or done by hand ("erscheinen einmal")
  const bekannt = await withSystem(async (tx) => new Set((await tx.execute<{ dedupe_key: string }>(sql`
    SELECT dedupe_key FROM hints WHERE dedupe_key = ANY (${`{${[...keys].map((k) => `"${k.replace(/(["\\])/g, '\\$1')}"`).join(',')}}`}::text[])`)).rows.map((r) => r.dedupe_key)));
  let neu = 0;
  for (const u of alle) {
    if (bekannt.has(u.dedupe_key)) continue;
    bekannt.add(u.dedupe_key);
    const id = crypto.randomUUID();
    await runAction(SYSTEM, 'hint.create', {
      id, kind: u.kind, text: u.text, reason: u.reason, dedupe_key: u.dedupe_key, target_type: u.target_type, target_id: u.target_id,
      ...(u.user_id ? { user_id: u.user_id } : {}), ...(u.area_id ? { area_id: u.area_id } : {}), options: u.options?.(id) ?? [],
    });
    neu++;
  }
  const weg = await erledigt(keys);
  for (const id of weg) await runAction(SYSTEM, 'hint.resolve', { hint_id: id });
  return { neu, erledigt: weg.length };
}
