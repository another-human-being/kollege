// Reading tools of the chat (§9.1). Everything runs with the rights of the user (RLS):
// the model sees exactly what the user may see. Results carry `quellen` for citations.
import { sql } from 'drizzle-orm';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { withUser } from '@/lib/db/client';
import { berlinDate } from '@/lib/time';
import { areaList, matterDetail, type Commitment } from '@/lib/views/areas';
import { orgDetail, personDetail } from '@/lib/views/contacts';
import { taskList } from '@/lib/views/tasks';
import type { TimelineItem } from '@/lib/views/timeline';
import { hrefFor, quellenFuer } from './quellen';
import { STATS, statsNamen } from './stats';

export interface WerkzeugKontext {
  userId: string;
  now: Date;
  chatId?: string;
}

const tagIso = (iso: string | null) => (iso ? berlinDate(new Date(iso)) : null);

function zusagen(c: { ours: Commitment[]; theirs: Commitment[] }) {
  const z = (x: Commitment) => ({
    id: x.id, title: x.title, owner: x.owner, due: tagIso(x.due_at), status: x.status, overdue: x.overdue,
    // cite this id: the source entry when readable, otherwise the task itself
    source_id: x.source?.readable ? x.source.entry_id : x.id,
    ...(x.source && !x.source.readable ? { source_hidden: `aus ${x.source.owners.join('/')}s Mail – Inhalt nicht lesbar` } : {}),
  });
  return { we_owe: c.ours.map(z), owed_to_us: c.theirs.map(z) };
}

function verlauf(items: TimelineItem[]) {
  return items.slice(-20).map((i) =>
    i.type === 'entry'
      ? { id: i.id, kind: i.kind, date: tagIso(i.at), title: i.title, summary: i.summary, author: i.author }
      : { kind: i.kind, date: tagIso(i.at), hidden: `nur für ${i.owners.join(', ')} lesbar` },
  );
}

function quellIds(c: { ours: Commitment[]; theirs: Commitment[] }, entryIds: string[]) {
  const all = [...c.ours, ...c.theirs];
  return {
    entries: [...entryIds, ...all.filter((x) => x.source?.readable).map((x) => x.source!.entry_id)],
    tasks: all.filter((x) => !x.source?.readable).map((x) => x.id),
  };
}

export function lesewerkzeuge(k: WerkzeugKontext): ToolSet {
  const { userId, now } = k;
  return {
    search: tool({
      description:
        'Sucht in allem, was du sehen darfst: Events, Lehrveranstaltungen, Beiträge, Themen, Organisationen, Personen und Einträge (Mails, Termine, Dateien, Notizen). ' +
        'Volltext auf Deutsch; mehrere Begriffe mit OR verbinden, wenn einer reicht. Nutze das zuerst, um IDs zu finden.',
      inputSchema: z.object({
        query: z.string().min(2),
        types: z.array(z.enum(['matter', 'org', 'person', 'entry'])).optional().describe('nur diese Arten (Standard: alle)'),
      }),
      execute: async ({ query, types }) =>
        withUser(userId, async (tx) => {
          const want = (t: string) => !types?.length || types.includes(t as never);
          const like = `%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
          const q = sql`websearch_to_tsquery('german', ${query})`;
          const matters = want('matter')
            ? (await tx.execute(sql`
                SELECT m.id, m.title, a.key AS area_key, a.name_singular AS area, m.status, m.phase, u.name AS owner,
                       o.name AS org, m.review_state = 'unreviewed' AS unreviewed
                FROM matters m JOIN areas a ON a.id = m.area_id
                LEFT JOIN users u ON u.id = m.owner_user_id LEFT JOIN orgs o ON o.id = m.org_id
                WHERE m.review_state <> 'discarded' AND (m.title ILIKE ${like} OR o.name ILIKE ${like} OR to_tsvector('german', m.title) @@ ${q})
                ORDER BY m.status, m.updated_at DESC LIMIT 10`)).rows
            : [];
          const orgs = want('org')
            ? (await tx.execute(sql`
                SELECT o.id, o.name, o.role, o.phase, u.name AS owner, o.domains FROM orgs o LEFT JOIN users u ON u.id = o.owner_user_id
                WHERE o.review_state <> 'discarded' AND o.merged_into_id IS NULL
                  AND (o.name ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(o.domains) d WHERE d ILIKE ${like}))
                ORDER BY o.name LIMIT 10`)).rows
            : [];
          const people = want('person')
            ? (await tx.execute(sql`
                SELECT p.id, p.name, p.role, o.name AS org, array_remove(array_agg(pe.email ORDER BY pe.email), NULL) AS emails
                FROM people p LEFT JOIN orgs o ON o.id = p.org_id LEFT JOIN person_emails pe ON pe.person_id = p.id
                WHERE p.review_state <> 'discarded' AND p.merged_into_id IS NULL
                  AND (p.name ILIKE ${like} OR EXISTS (SELECT 1 FROM person_emails x WHERE x.person_id = p.id AND x.email ILIKE ${like}))
                GROUP BY p.id, o.name ORDER BY p.name LIMIT 10`)).rows
            : [];
          const entries = want('entry')
            ? (await tx.execute<{ id: string; kind: string; occurred_at: string; title: string | null; snippet: string | null }>(sql`
                SELECT e.id, e.kind, e.occurred_at, e.title, left(coalesce(e.summary, e.body_text), 300) AS snippet
                FROM entries e
                WHERE e.kind NOT IN ('instruction', 'system') AND (e.search @@ ${q} OR e.title ILIKE ${like})
                ORDER BY ts_rank(e.search, ${q}) DESC, e.occurred_at DESC LIMIT 10`)).rows
            : [];
          const quellen = await quellenFuer(tx, { entries: entries.map((e) => e.id) }, now);
          return {
            matters: matters.map((m) => ({ ...m, href: hrefFor('matter', m.id as string) })),
            orgs: orgs.map((o) => ({ ...o, href: hrefFor('org', o.id as string) })),
            people: people.map((p) => ({ ...p, href: hrefFor('person', p.id as string) })),
            entries: entries.map((e) => ({ id: e.id, kind: e.kind, date: tagIso(new Date(e.occurred_at).toISOString()), title: e.title, snippet: e.snippet })),
            quellen,
          };
        }),
    }),

    get_matter: tool({
      description: 'Ein Event, eine Lehrveranstaltung, ein Beitrag oder ein Thema eines Gründungsteams mit Feldern, Zusagen beider Seiten, Notizen und Verlauf.',
      inputSchema: z.object({ id: z.uuid() }),
      execute: async ({ id }) => {
        const d = await matterDetail(userId, id, now);
        if (!d) return { error: 'nicht gefunden oder nicht sichtbar' };
        const ids = quellIds(d.commitments, [...d.timeline.filter((i) => i.type === 'entry').map((i) => i.id), ...d.notes.map((n) => n.id), ...d.files.map((f) => f.id)]);
        return {
          id: d.id, title: d.title, area: d.area.name_singular, area_key: d.area.key, status: d.status, phase: d.phase,
          owner: d.owner?.name ?? null, handover_to: d.handoverTo?.name ?? null, fields: d.fields, unreviewed: d.unreviewed,
          waiting: d.waiting, stale: d.stale, date_start: tagIso(d.date_start), date_end: tagIso(d.date_end), outcome_note: d.outcome_note,
          next_step: d.nextStep ? { title: d.nextStep.title, due: tagIso(d.nextStep.due_at) } : null,
          commitments: zusagen(d.commitments),
          notes: d.notes.map((n) => ({ id: n.id, date: tagIso(n.at), author: n.author, conversation: n.conversation, text: n.body })),
          files: d.files.map((f) => ({ id: f.id, date: tagIso(f.at), title: f.title, summary: f.summary })),
          timeline: verlauf(d.timeline),
          references: d.references,
          advice: d.rat.filter((r) => !r.frage).map((r) => ({ text: r.text, evidence: r.belege })),
          href: hrefFor('matter', d.id),
          quellen: await withUser(userId, (tx) => quellenFuer(tx, ids, now)),
        };
      },
    }),

    get_contact: tool({
      description: 'Eine Organisation (z. B. Gründungsteam) oder Person: Stammdaten, Themen, Zusagen, Notizen, Verlauf.',
      inputSchema: z.object({ type: z.enum(['org', 'person']), id: z.uuid() }),
      execute: async ({ type, id }) => {
        if (type === 'org') {
          const o = await orgDetail(userId, id, now);
          if (!o) return { error: 'nicht gefunden oder nicht sichtbar' };
          const ids = quellIds(o.commitments, [...o.timeline.filter((i) => i.type === 'entry').map((i) => i.id), ...o.notes.map((n) => n.id), ...o.files.map((f) => f.id)]);
          return {
            id: o.id, name: o.name, role: o.role, domains: o.domains, phase: o.phase, fields: o.fields, owner: o.owner?.name ?? null,
            handover_to: o.handoverTo?.name ?? null, last_contact: tagIso(o.lastContact), people: o.people,
            topics: o.matters, commitments: zusagen(o.commitments),
            notes: o.notes.map((n) => ({ id: n.id, date: tagIso(n.at), author: n.author, conversation: n.conversation, text: n.body })),
            files: o.files.map((f) => ({ id: f.id, date: tagIso(f.at), title: f.title, summary: f.summary })),
            timeline: verlauf(o.timeline),
            href: hrefFor('org', o.id),
            quellen: await withUser(userId, (tx) => quellenFuer(tx, ids, now)),
          };
        }
        const p = await personDetail(userId, id, now);
        if (!p) return { error: 'nicht gefunden oder nicht sichtbar' };
        return {
          id: p.id, name: p.name, role: p.role, notes: p.notes, org: p.org, emails: p.emails, matters: p.matters,
          owes_us: p.owes.map((t) => ({ id: t.id, title: t.title, due: tagIso(t.due_at), status: t.status, overdue: t.overdue })),
          timeline: verlauf(p.timeline),
          href: hrefFor('person', p.id),
          quellen: await withUser(userId, (tx) =>
            quellenFuer(tx, { entries: p.timeline.filter((i) => i.type === 'entry').map((i) => i.id), tasks: p.owes.map((t) => t.id) }, now)),
        };
      },
    }),

    list_tasks: tool({
      description: 'Aufgaben (wir schulden: ours) und Zusagen anderer (theirs). Standard: alle offenen im Team.',
      inputSchema: z.object({
        direction: z.enum(['ours', 'theirs']).optional(),
        status: z.enum(['open', 'done']).optional(),
        scope: z.enum(['mine', 'team']).optional().describe('mine = meine Aufgaben und Zusagen an mich'),
      }),
      execute: async (f) => {
        const rows = await taskList(userId, f, now);
        return {
          tasks: rows.slice(0, 50).map((t) => ({
            id: t.id, title: t.title, direction: t.direction, status: t.status, owner: t.owner, due: tagIso(t.due_at),
            overdue: t.overdue, private: t.private, matter: t.matter,
            source_id: t.source?.readable ? t.source.entry_id : t.id,
          })),
          total: rows.length,
          quellen: await withUser(userId, (tx) =>
            quellenFuer(tx, { entries: rows.filter((t) => t.source?.readable).map((t) => t.source!.entry_id), tasks: rows.filter((t) => !t.source?.readable).map((t) => t.id) }, now)),
        };
      },
    }),

    get_area_items: tool({
      description: 'Liste eines Bereichs (z. B. events, lehre, social, gruendungsteams) mit Phase, zuständig und berechneten Zuständen (wartet, hängt).',
      inputSchema: z.object({
        area_key: z.string(),
        phase: z.string().optional(),
        status: z.enum(['open', 'done']).optional(),
        owner: z.enum(['me', 'nobody']).optional(),
        unreviewed: z.boolean().optional(),
      }),
      execute: async ({ area_key, owner, ...f }) => {
        try {
          const { area, rows, unreviewedCount } = await areaList(userId, area_key, { ...f, owner: owner === 'me' ? userId : owner === 'nobody' ? 'none' : undefined }, now);
          return {
            area: area.name_plural, phases: area.phases, total: rows.length, unreviewed_in_area: unreviewedCount,
            items: rows.slice(0, 50).map((r) => ({
              id: r.id, type: r.type, title: r.title, phase: r.phase, owner: r.owner, status: r.status, fields: r.fields,
              unreviewed: r.unreviewed, waiting: r.waiting, stale: r.stale, last_activity: tagIso(r.last_activity),
              href: hrefFor(r.type, r.id),
            })),
          };
        } catch {
          return { error: `Bereich ${area_key} gibt es nicht` };
        }
      },
    }),

    stats: tool({
      description: `Zahlen nur hierüber, nie aus dem Gedächtnis. Vordefinierte Abfragen: ${statsNamen()}.`,
      inputSchema: z.object({ name: z.enum(Object.keys(STATS) as [string, ...string[]]), params: z.record(z.string(), z.string()).optional() }),
      execute: async ({ name, params }) => {
        const s = STATS[name]!;
        const parsed = s.params.safeParse(params ?? {});
        if (!parsed.success) return { error: `Parameter für ${name}: ${s.beschreibung}` };
        return { name, rows: await withUser(userId, (tx) => s.run(tx, parsed.data as never, now)) };
      },
    }),
  };
}
