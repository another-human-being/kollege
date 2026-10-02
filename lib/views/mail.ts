// Mail (§11, E26, E38): threads by mailbox (mine / StartHub / all) and folder; a thread with
// its mails, placeholders for mails the user may not read (E13) and the user's drafts.
// Folders are derived, not taken from folder names (they differ per server):
//   Eingang   a copy in INBOX of the chosen mailbox(es)
//   Gesendet  sent from the mailbox's address
//   Archiv    received, no copy in INBOX any more
import { sql, type SQL } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export type Postfach = 'mein' | 'starthub' | 'alle';
export type Ordner = 'eingang' | 'gesendet' | 'archiv' | 'entwuerfe';
export type MailFilter = 'ungelesen' | 'anhang' | 'ohne_zuordnung';

export interface ThreadZeile {
  thread: string;
  betreff: string | null;
  /** the other side: sender of the newest received mail, or the recipients of a sent one */
  von: string;
  at: string;
  vorschau: string;
  anzahl: number;
  ungelesen: boolean;
  anhang: boolean;
  bezug: string | null;
}

export interface Postfaecher {
  mein: { id: string; address: string } | null;
  starthub: { id: string; address: string } | null;
}

export async function postfaecher(userId: string): Promise<Postfaecher> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string; user_id: string | null; address: string | null }>(sql`
      SELECT id, user_id, config->>'address' AS address FROM connections
      WHERE kind = 'mail' AND provider IN ('imap', 'fixture') AND status <> 'disabled' ORDER BY created_at`);
    const mine = r.rows.find((c) => c.user_id === userId);
    const team = r.rows.find((c) => c.user_id === null);
    return {
      mein: mine ? { id: mine.id, address: mine.address ?? '' } : null,
      starthub: team ? { id: team.id, address: team.address ?? '' } : null,
    };
  });
}

function copyScope(p: Postfach, userId: string): SQL {
  if (p === 'mein') return sql`c.user_id = ${userId}`;
  if (p === 'starthub') return sql`c.user_id IS NULL`;
  return sql`true`;
}

export async function threadListe(
  userId: string,
  o: { postfach: Postfach; ordner: Ordner; filter?: MailFilter; q?: string },
): Promise<ThreadZeile[]> {
  return withUser(userId, async (tx) => {
    if (o.ordner === 'entwuerfe') {
      const r = await tx.execute<{ id: string; title: string | null; to: string[] | null; updated_at: string; body: string | null }>(sql`
        SELECT e.id, e.title, ARRAY(SELECT jsonb_array_elements_text(e.meta->'to')) AS to, e.updated_at, left(e.body_text, 160) AS body
        FROM entries e WHERE e.kind = 'draft' AND e.author_user_id = ${userId} ORDER BY e.updated_at DESC LIMIT 200`);
      return r.rows.map((d) => ({
        thread: `entwurf:${d.id}`, betreff: d.title, von: d.to?.join(', ') || '(ohne Empfänger)', at: new Date(d.updated_at).toISOString(),
        vorschau: d.body ?? '', anzahl: 1, ungelesen: false, anhang: false, bezug: null,
      }));
    }
    const scope = copyScope(o.postfach, userId);
    const addresses = sql`ARRAY(SELECT lower(c.config->>'address') FROM connections c WHERE c.kind = 'mail' AND ${scope})`;
    const imOrdner =
      o.ordner === 'gesendet'
        ? sql`lower(e.meta->'from'->>'email') = ANY(${addresses})`
        : o.ordner === 'eingang'
          ? sql`EXISTS (SELECT 1 FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id
                        WHERE mc.entry_id = e.id AND ${scope} AND upper(mc.folder) = 'INBOX' AND mc.target_folder IS NULL)`
          : sql`NOT (lower(e.meta->'from'->>'email') = ANY(${addresses}))
                AND EXISTS (SELECT 1 FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id WHERE mc.entry_id = e.id AND ${scope})
                AND NOT EXISTS (SELECT 1 FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id
                                WHERE mc.entry_id = e.id AND ${scope} AND upper(mc.folder) = 'INBOX' AND mc.target_folder IS NULL)`;
    const q = o.q?.trim();
    const r = await tx.execute<{
      thread: string; betreff: string | null; von_name: string | null; von_email: string | null; an: string | null; gesendet: boolean;
      at: string; vorschau: string | null; anzahl: number; ungelesen: boolean; anhang: boolean; bezug: string | null;
    }>(sql`
      WITH m AS (
        SELECT e.* FROM entries e
        WHERE e.kind = 'mail' AND e.thread_key IS NOT NULL AND ${imOrdner}
          ${q ? sql`AND (e.search @@ websearch_to_tsquery('german', ${q}) OR e.title ILIKE ${`%${q}%`} OR e.meta->'from'->>'email' ILIKE ${`%${q}%`})` : sql``}
      ),
      t AS (
        SELECT DISTINCT ON (m.thread_key) m.thread_key AS thread, m.id, m.title AS betreff, m.meta, m.occurred_at, m.body_text
        FROM m ORDER BY m.thread_key, m.occurred_at DESC
      )
      SELECT t.thread, t.betreff, t.meta->'from'->>'name' AS von_name, t.meta->'from'->>'email' AS von_email,
             (SELECT string_agg(coalesce(x->>'name', x->>'email'), ', ') FROM jsonb_array_elements(t.meta->'to') x) AS an,
             lower(t.meta->'from'->>'email') = ANY(${addresses}) AS gesendet,
             t.occurred_at AS at, left(regexp_replace(coalesce(t.body_text, ''), '\\s+', ' ', 'g'), 160) AS vorschau,
             (SELECT count(*)::int FROM entries x WHERE x.kind = 'mail' AND x.thread_key = t.thread) AS anzahl,
             EXISTS (SELECT 1 FROM entries x JOIN mail_copies mc ON mc.entry_id = x.id JOIN connections c ON c.id = mc.connection_id
                     WHERE x.thread_key = t.thread AND NOT mc.seen AND (c.user_id = ${userId} OR c.user_id IS NULL)) AS ungelesen,
             EXISTS (SELECT 1 FROM entries x WHERE x.thread_key = t.thread AND jsonb_array_length(coalesce(x.meta->'attachments', '[]'::jsonb)) > 0) AS anhang,
             (SELECT coalesce(mt.title, o.name) FROM entries x JOIN links l ON l.entry_id = x.id
                LEFT JOIN matters mt ON l.target_type = 'matter' AND mt.id = l.target_id
                LEFT JOIN orgs o ON l.target_type = 'org' AND o.id = l.target_id
              WHERE x.thread_key = t.thread AND l.target_type IN ('matter', 'org')
              ORDER BY (l.target_type = 'matter') DESC, l.created_at DESC LIMIT 1) AS bezug
      FROM t ORDER BY t.occurred_at DESC LIMIT 300`);
    return r.rows
      .filter((t) => (o.filter === 'ungelesen' ? t.ungelesen : o.filter === 'anhang' ? t.anhang : o.filter === 'ohne_zuordnung' ? !t.bezug : true))
      .map((t) => ({
        thread: t.thread, betreff: t.betreff, von: t.gesendet ? `an ${t.an ?? '–'}` : (t.von_name || t.von_email || '–'),
        at: new Date(t.at).toISOString(), vorschau: t.vorschau ?? '', anzahl: t.anzahl, ungelesen: t.ungelesen, anhang: t.anhang, bezug: t.bezug,
      }));
  });
}

export interface MailNachricht {
  id: string;
  at: string;
  von: { name?: string; email: string };
  an: { name?: string; email: string }[];
  cc: { name?: string; email: string }[];
  text: string;
  anhaenge: { index: number; filename: string; mime: string }[];
  /** sent from Kollege (E11: small note of origin) */
  ueberKollege: boolean;
  /** the user has an unread copy */
  ungelesen: boolean;
  /** the user has a copy in an inbox (archivable) */
  imEingang: boolean;
}

export interface MailThread {
  thread: string;
  betreff: string | null;
  nachrichten: MailNachricht[];
  /** mails of the thread the user may not read: who has them (E13) */
  platzhalter: { at: string; owners: string[] }[];
  bezuege: { type: 'matter' | 'org' | 'person'; id: string; name: string; origin: string; confidence: string; link_id: string; entry_id: string }[];
  entwuerfe: { id: string; title: string | null; updated_at: string }[];
}

export async function mailThread(userId: string, thread: string): Promise<MailThread | null> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string; occurred_at: string; title: string | null; body_text: string | null; meta: Record<string, unknown>; ungelesen: boolean; im_eingang: boolean }>(sql`
      SELECT e.id, e.occurred_at, e.title, e.body_text, e.meta,
             EXISTS (SELECT 1 FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id
                     WHERE mc.entry_id = e.id AND NOT mc.seen AND (c.user_id = ${userId} OR c.user_id IS NULL)) AS ungelesen,
             EXISTS (SELECT 1 FROM mail_copies mc JOIN connections c ON c.id = mc.connection_id
                     WHERE mc.entry_id = e.id AND upper(mc.folder) = 'INBOX' AND mc.target_folder IS NULL AND (c.user_id = ${userId} OR c.user_id IS NULL)) AS im_eingang
      FROM entries e WHERE e.kind = 'mail' AND e.thread_key = ${thread} ORDER BY e.occurred_at`);
    if (!r.rows.length) return null;
    const stubs = await tx.execute<{ occurred_at: string; owners: string[] }>(sql`
      SELECT occurred_at, owner_names AS owners FROM thread_stubs(${thread})`);
    const bezuege = await tx.execute<MailThread['bezuege'][number]>(sql`
      SELECT DISTINCT ON (l.target_type, l.target_id) l.target_type AS type, l.target_id AS id, l.origin, l.confidence, l.id AS link_id, l.entry_id,
             coalesce(m.title, o.name, p.name) AS name
      FROM links l JOIN entries e ON e.id = l.entry_id
      LEFT JOIN matters m ON l.target_type = 'matter' AND m.id = l.target_id
      LEFT JOIN orgs o ON l.target_type = 'org' AND o.id = l.target_id
      LEFT JOIN people p ON l.target_type = 'person' AND p.id = l.target_id
      WHERE e.kind = 'mail' AND e.thread_key = ${thread}
      ORDER BY l.target_type, l.target_id, e.occurred_at DESC`);
    const ids = r.rows.map((m) => m.id);
    const entwuerfe = await tx.execute<{ id: string; title: string | null; updated_at: string }>(sql`
      SELECT id, title, updated_at FROM entries
      WHERE kind = 'draft' AND author_user_id = ${userId} AND meta->>'bezug_entry_id' = ANY(${`{${ids.join(',')}}`}::text[])
      ORDER BY updated_at DESC`);
    const adr = (v: unknown) => ((v as { name?: string; email: string }[] | undefined) ?? []);
    return {
      thread,
      betreff: r.rows[0]!.title,
      nachrichten: r.rows.map((m) => ({
        id: m.id,
        at: new Date(m.occurred_at).toISOString(),
        von: (m.meta.from as { name?: string; email: string }) ?? { email: '?' },
        an: adr(m.meta.to),
        cc: adr(m.meta.cc),
        text: m.body_text ?? '',
        anhaenge: ((m.meta.attachments as { filename: string; mime: string }[] | undefined) ?? []).map((a, index) => ({ index, filename: a.filename, mime: a.mime })),
        ueberKollege: m.meta.via_kollege === true,
        ungelesen: m.ungelesen,
        imEingang: m.im_eingang,
      })),
      platzhalter: stubs.rows.map((s) => ({ at: new Date(s.occurred_at).toISOString(), owners: s.owners ?? [] })),
      bezuege: bezuege.rows.filter((b) => b.name),
      entwuerfe: entwuerfe.rows.map((d) => ({ ...d, updated_at: new Date(d.updated_at).toISOString() })),
    };
  });
}

/** a draft for the editor (only the author can read it, RLS) */
export async function entwurf(userId: string, id: string) {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string; title: string | null; body_text: string | null; meta: Record<string, unknown> }>(sql`
      SELECT id, title, body_text, meta FROM entries WHERE id = ${id} AND kind = 'draft'`);
    return r.rows[0] ?? null;
  });
}

/** what a mail can be assigned to in the thread head: open entries of all areas, organisations */
export async function zuordnungsziele(userId: string): Promise<{ type: 'matter' | 'org'; id: string; name: string }[]> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ type: 'matter' | 'org'; id: string; name: string }>(sql`
      SELECT 'matter' AS type, m.id, a.name_singular || ': ' || m.title AS name FROM matters m JOIN areas a ON a.id = m.area_id
      WHERE m.status = 'open' AND m.review_state <> 'discarded'
      UNION ALL
      SELECT 'org', o.id, 'Organisation: ' || o.name FROM orgs o WHERE o.review_state <> 'discarded' AND o.merged_into_id IS NULL
      ORDER BY name LIMIT 500`);
    return r.rows;
  });
}
