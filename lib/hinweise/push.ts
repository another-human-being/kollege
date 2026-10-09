// Hinweise outside the app (answer of 09.10.2026): a push notification on the person's devices –
// not a mail. It says what it is in one line and opens the place where the details are (the mail
// thread, the topic, the task). Details never travel in the notification.
// - only personal hints (user_id); team hints stay in "Im Team"
// - the person's instructions about hints apply as on Heute (decision 42)
// - quiet hours: Monday to Friday 07:00–20:00 Berlin; what comes up outside waits for the next run
// - several new hints of one run → one notification per person
// - every hint once (notified_at), also when nobody gets it; older than 3 days → never
import { sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { HinweisRegel, verborgen } from '@/lib/actions/instruction';
import { withSystem } from '@/lib/db/client';
import { senden, vapidOeffentlich, type Nachricht } from '@/lib/push/senden';
import { berlinDate, berlinMinutes } from '@/lib/time';
import { HINWEIS_ART } from '@/lib/views/settings';

const SYSTEM = { type: 'system' } as const;
const MAX_ALTER_TAGE = 3;

export function wochentag(now: Date): number {
  return ((new Date(`${berlinDate(now)}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** Monday to Friday, 07:00–20:00 Berlin */
export function ruhezeit(now: Date): boolean {
  const m = berlinMinutes(now);
  return wochentag(now) > 5 || m < 7 * 60 || m >= 20 * 60;
}

type Offen = { id: string; user_id: string; kind: string; text: string; area_key: string | null; href: string; created_at: string };
type Zeile = Omit<Offen, 'href'> & { target_type: string | null; target_id: string | null; entry_kind: string | null; thread_key: string | null };

/** where the details are: the mail thread, the event, the file, the topic, the task, the contact */
export function ziel(h: { target_type: string | null; target_id: string | null; entry_kind: string | null; thread_key: string | null }): string {
  if (!h.target_id) return '/heute';
  switch (h.target_type) {
    case 'entry':
      return h.entry_kind === 'mail' ? (h.thread_key ? `/mail?t=${encodeURIComponent(h.thread_key)}` : '/mail')
        : h.entry_kind === 'event' ? `/kalender?t=${h.target_id}` : h.entry_kind === 'file' ? `/dateien?d=${h.target_id}` : '/heute';
    case 'matter': return `/m/${h.target_id}`;
    case 'task': return `/aufgaben?id=${h.target_id}`;
    case 'person': return `/p/${h.target_id}`;
    case 'org': return `/o/${h.target_id}`;
    default: return '/heute';
  }
}

export function nachricht(xs: Pick<Offen, 'id' | 'kind' | 'text' | 'href'>[]): Nachricht {
  if (xs.length === 1) {
    const h = xs[0]!;
    return { title: HINWEIS_ART[h.kind] ?? 'Kollege', body: h.text, url: h.href, tag: h.id };
  }
  const zeilen = xs.slice(0, 3).map((h) => h.text);
  if (xs.length > 3) zeilen.push(`und ${xs.length - 3} weitere`);
  return { title: `${xs.length} neue Hinweise`, body: zeilen.join('\n'), url: '/heute', tag: 'hinweise' };
}

export async function benachrichtigen(now = new Date()): Promise<number> {
  if (!vapidOeffentlich()) return 0; // not set up: nothing is marked, nothing is lost
  const offen: Offen[] = (await withSystem(async (tx) => (await tx.execute<Zeile>(sql`
    SELECT h.id, h.user_id, h.kind, h.text, a.key AS area_key, h.created_at, h.target_type, h.target_id, e.kind AS entry_kind, e.thread_key
    FROM hints h LEFT JOIN areas a ON a.id = h.area_id
    LEFT JOIN entries e ON h.target_type = 'entry' AND e.id = h.target_id
    WHERE h.notified_at IS NULL AND h.user_id IS NOT NULL AND h.status = 'open'
      AND (h.show_from IS NULL OR h.show_from <= ${now})
    ORDER BY h.created_at`)).rows)).map((h) => ({ id: h.id, user_id: h.user_id, kind: h.kind, text: h.text, area_key: h.area_key, created_at: h.created_at, href: ziel(h) }));
  const alt = offen.filter((h) => new Date(h.created_at).getTime() < now.getTime() - MAX_ALTER_TAGE * 86_400_000);
  if (alt.length) await runAction(SYSTEM, 'hint.notified', { hint_ids: alt.map((h) => h.id) });
  if (ruhezeit(now)) return 0;

  const tag = wochentag(now);
  let gesendet = 0;
  const proPerson = new Map<string, Offen[]>();
  for (const h of offen) if (!alt.includes(h)) proPerson.set(h.user_id, [...(proPerson.get(h.user_id) ?? []), h]);
  for (const [userId, hs] of proPerson) {
    const { regeln, geraete } = await withSystem(async (tx) => ({
      regeln: (await tx.execute<{ r: unknown }>(sql`
        SELECT meta->'hinweise' AS r FROM entries WHERE kind = 'instruction' AND instruction_user_id = ${userId} AND meta ? 'hinweise'`))
        .rows.flatMap((x) => { const r = HinweisRegel.safeParse(x.r); return r.success ? [r.data] : []; }),
      geraete: (await tx.execute<{ id: string; subscription: string }>(sql`
        SELECT id, subscription FROM push_subscriptions WHERE user_id = ${userId}`)).rows,
    }));
    const zeigen = hs.filter((h) => !verborgen(regeln, h.kind, h.area_key, tag));
    // hidden for good ("keine Stale-Hinweise") is done; hidden today ("nur montags") waits for its day
    const nie = hs.filter((h) => [1, 2, 3, 4, 5, 6, 7].every((d) => verborgen(regeln, h.kind, h.area_key, d)));
    let fertig = !geraete.length || !zeigen.length;
    if (geraete.length && zeigen.length) {
      const n = nachricht(zeigen);
      let ok = false;
      for (const g of geraete) {
        const r = await senden(g.subscription, n);
        if (r === 'ok') ok = true;
        // a device the push service no longer knows (uninstalled, permission withdrawn)
        if (r === 'weg') await runAction(SYSTEM, 'push.unsubscribe', { id: g.id });
      }
      if (ok) gesendet++;
      // sent, or every device gone: done; a passing error: the next run tries again
      fertig = ok || (await withSystem(async (tx) => (await tx.execute(sql`SELECT 1 FROM push_subscriptions WHERE user_id = ${userId}`)).rows.length === 0));
    }
    const erledigt = fertig ? (geraete.length ? [...zeigen, ...nie] : hs) : nie;
    if (erledigt.length) await runAction(SYSTEM, 'hint.notified', { hint_ids: [...new Set(erledigt.map((h) => h.id))] });
  }
  return gesendet;
}
