// Dateien (§11, stage 7): files from the drive and from mails, as the user may see them (RLS).
// A drive file has a version per content (dedupe path + hash, §4): the list shows the newest of
// each path; deleted ones are gone from the list, their versions stay in the history of a topic.
import { sql } from 'drizzle-orm';
import { withUser } from '@/lib/db/client';

export interface DateiZeile {
  id: string;
  name: string;
  /** path on the drive; null for a mail attachment */
  pfad: string | null;
  at: string;
  bezug: string | null;
  summary: string | null;
}

export interface Ordner { pfad: string; name: string; tiefe: number; anzahl: number }

export type DateiFilter = 'zugeordnet' | 'ohne_zuordnung';

/** the current version of every visible file */
const AKTUELL = sql`
  SELECT DISTINCT ON (coalesce(e.connection_id::text, '') || ':' || coalesce(e.external_id, e.id::text)) e.*
  FROM entries e
  WHERE e.kind = 'file' AND NOT (e.meta ? 'geloescht')
  ORDER BY coalesce(e.connection_id::text, '') || ':' || coalesce(e.external_id, e.id::text), e.occurred_at DESC, e.created_at DESC`;

const BEZUG = sql`(SELECT coalesce(m.title, o.name, p.name) FROM links l
    LEFT JOIN matters m ON l.target_type = 'matter' AND m.id = l.target_id
    LEFT JOIN orgs o ON l.target_type = 'org' AND o.id = l.target_id
    LEFT JOIN people p ON l.target_type = 'person' AND p.id = l.target_id
  WHERE l.entry_id = f.id ORDER BY (l.target_type = 'matter') DESC, (l.target_type = 'org') DESC LIMIT 1)`;

export async function dateiListe(userId: string, o: { ordner?: string; filter?: DateiFilter; q?: string } = {}): Promise<DateiZeile[]> {
  return withUser(userId, async (tx) => {
    const ordner = o.ordner === 'mail' ? sql`f.meta->>'path' IS NULL`
      : o.ordner ? sql`(f.meta->>'path' LIKE ${`${o.ordner.replace(/[\\%_]/g, '\\$&')}/%`})` : sql`true`;
    const filter = o.filter === 'zugeordnet' ? sql`EXISTS (SELECT 1 FROM links l WHERE l.entry_id = f.id)`
      : o.filter === 'ohne_zuordnung' ? sql`NOT EXISTS (SELECT 1 FROM links l WHERE l.entry_id = f.id)` : sql`true`;
    const q = o.q?.trim();
    const suche = q ? sql`(f.search @@ plainto_tsquery('german', ${q}) OR f.title ILIKE ${`%${q.replace(/[\\%_]/g, '\\$&')}%`})` : sql`true`;
    const r = await tx.execute<{ id: string; title: string | null; pfad: string | null; occurred_at: string; bezug: string | null; summary: string | null }>(sql`
      SELECT f.id, f.title, f.meta->>'path' AS pfad, f.occurred_at, f.summary, ${BEZUG} AS bezug
      FROM (${AKTUELL}) f
      WHERE ${ordner} AND ${filter} AND ${suche}
      ORDER BY f.occurred_at DESC LIMIT 300`);
    return r.rows.map((x) => ({ id: x.id, name: x.title ?? '(ohne Namen)', pfad: x.pfad, at: new Date(x.occurred_at).toISOString(), bezug: x.bezug, summary: x.summary }));
  });
}

/** folders of the first two levels with the number of files below them, plus "Aus Mails" */
export async function ordnerBaum(userId: string): Promise<{ ordner: Ordner[]; mail: number; alle: number }> {
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ pfad: string | null }>(sql`SELECT f.meta->>'path' AS pfad FROM (${AKTUELL}) f`);
    const zahl = new Map<string, number>();
    let mail = 0;
    for (const { pfad } of r.rows) {
      if (!pfad) { mail++; continue; }
      const teile = pfad.split('/').slice(0, -1);
      for (let i = 1; i <= Math.min(2, teile.length); i++) {
        const k = teile.slice(0, i).join('/');
        zahl.set(k, (zahl.get(k) ?? 0) + 1);
      }
    }
    const ordner = [...zahl.entries()].sort(([a], [b]) => a.localeCompare(b, 'de'))
      .map(([pfad, anzahl]) => ({ pfad, name: pfad.split('/').at(-1)!, tiefe: pfad.split('/').length - 1, anzahl }));
    return { ordner, mail, alle: r.rows.length };
  });
}

export interface DateiDetail {
  id: string;
  name: string;
  pfad: string | null;
  /** path as the team opens it (\\server\share\…), when configured */
  netzpfad: string | null;
  mime: string | null;
  size: number | null;
  at: string;
  von: string | null;
  summary: string | null;
  text: string | null;
  sichtbar: string;
  herunterladbar: boolean;
  mail: { id: string; thread: string | null; betreff: string | null; von: string | null } | null;
  bezuege: { type: string; id: string; name: string; origin: string; link_id: string }[];
  versionen: { id: string; at: string; aktuell: boolean }[];
  geloescht: boolean;
}

export async function datei(userId: string, id: string): Promise<DateiDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{
      id: string; title: string | null; body_text: string | null; summary: string | null; meta: Record<string, unknown>; occurred_at: string;
      connection_id: string | null; external_id: string | null; visibility: string; visible_to: string[]; blob_path: string | null; von: string | null; config: Record<string, unknown> | null;
    }>(sql`
      SELECT e.id, e.title, e.body_text, e.summary, e.meta, e.occurred_at, e.connection_id, e.external_id, e.visibility, e.visible_to, e.blob_path,
             u.name AS von, c.config
      FROM entries e LEFT JOIN users u ON u.id = e.author_user_id LEFT JOIN connections c ON c.id = e.connection_id
      WHERE e.id = ${id} AND e.kind = 'file'`);
    const e = r.rows[0];
    if (!e) return null;
    const m = e.meta as { path?: string; mime?: string; size?: number; mail_entry_id?: string; geloescht?: boolean; zu_gross?: boolean };
    const bezuege = await tx.execute<DateiDetail['bezuege'][number]>(sql`
      SELECT l.target_type AS type, l.target_id AS id, l.origin, l.id AS link_id, coalesce(mt.title, o.name, p.name) AS name
      FROM links l
      LEFT JOIN matters mt ON l.target_type = 'matter' AND mt.id = l.target_id
      LEFT JOIN orgs o ON l.target_type = 'org' AND o.id = l.target_id
      LEFT JOIN people p ON l.target_type = 'person' AND p.id = l.target_id
      WHERE l.entry_id = ${id} ORDER BY l.target_type, name`);
    const versionen = m.path && e.connection_id
      ? (await tx.execute<{ id: string; occurred_at: string }>(sql`
          SELECT id, occurred_at FROM entries WHERE kind = 'file' AND connection_id = ${e.connection_id} AND external_id = ${e.external_id}
          ORDER BY occurred_at DESC, created_at DESC`)).rows
      : [];
    const [mail] = m.mail_entry_id
      ? (await tx.execute<{ id: string; thread_key: string | null; title: string | null; von: string | null }>(sql`
          SELECT id, thread_key, title, meta->'from'->>'name' AS von FROM entries WHERE id = ${m.mail_entry_id}`)).rows
      : [];
    const namen = e.visibility === 'team' ? [] : (await tx.execute<{ name: string }>(sql`
      SELECT name FROM users WHERE id = ANY (${`{${e.visible_to.join(',')}}`}::uuid[]) ORDER BY name`)).rows.map((x) => x.name);
    const unc = (e.config as { unc?: string } | null)?.unc;
    return {
      id: e.id, name: e.title ?? '(ohne Namen)', pfad: m.path ?? null,
      netzpfad: unc && m.path ? `${unc.replace(/\\+$/, '')}\\${m.path.replace(/\//g, '\\')}` : null,
      mime: m.mime ?? null, size: m.size ?? null, at: new Date(e.occurred_at).toISOString(), von: e.von,
      summary: e.summary, text: e.body_text,
      sichtbar: e.visibility === 'team' ? 'für das Team' : namen.length === 1 && e.visible_to[0] === userId ? 'nur für dich' : `für ${namen.join(', ')}`,
      herunterladbar: !!e.blob_path && !m.zu_gross,
      mail: mail ? { id: mail.id, thread: mail.thread_key, betreff: mail.title, von: mail.von } : null,
      bezuege: bezuege.rows,
      versionen: versionen.map((v) => ({ id: v.id, at: new Date(v.occurred_at).toISOString(), aktuell: v.id === versionen[0]?.id })),
      geloescht: !!m.geloescht,
    };
  });
}
