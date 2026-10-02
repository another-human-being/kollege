// Cards (Karte, §9.1): what the model just put into the record – one sentence per step,
// a link to where it lives, undo, and follow-up steps named (design: "nie still mitlöschen").
import { sql } from 'drizzle-orm';
import type { Tx } from '@/lib/db/client';
import { tag } from '@/lib/format';
import { hrefFor } from './quellen';

export interface Karte {
  actionId: string;
  art: 'quittung' | 'anweisung';
  geltung?: 'persoenlich' | 'team';
  privat?: boolean;
  punkte: string[];
  link: { text: string; href: string } | null;
  /** text of the applied instruction(s) */
  anweisung?: string;
  /** "entfernt auch 1 Aufgabe" */
  folgen?: string;
  undoable: boolean;
  /** a mail draft (design: Entwurf) – sending is a click of the person, never the model */
  entwurf?: { id: string; an: string; betreff: string; auszug: string };
}

type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const kurz = (t: string, n = 80) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

async function name(tx: Tx, type: 'matter' | 'org' | 'person' | 'user' | 'task' | 'area', id: unknown): Promise<string | null> {
  if (typeof id !== 'string') return null;
  const q = {
    matter: sql`SELECT title AS n FROM matters WHERE id = ${id}`,
    org: sql`SELECT name AS n FROM orgs WHERE id = ${id}`,
    person: sql`SELECT name AS n FROM people WHERE id = ${id}`,
    user: sql`SELECT name AS n FROM users WHERE id = ${id}`,
    task: sql`SELECT title AS n FROM tasks WHERE id = ${id}`,
    area: sql`SELECT name_singular AS n FROM areas WHERE id = ${id} OR key = ${id}`,
  }[type];
  const r = await tx.execute<{ n: string }>(q);
  return r.rows[0]?.n ?? null;
}

const bis = (p: P, now: Date) => {
  const d = s(p.due_date) ? `${s(p.due_date)}T12:00:00Z` : s(p.due_at);
  return d ? ` bis ${tag(d, now)}` : '';
};

const FOLGEN: Record<string, [string, string]> = {
  'task.create': ['Aufgabe', 'Aufgaben'],
  'note.create': ['Notiz', 'Notizen'],
  'entry.link': ['Zuordnung', 'Zuordnungen'],
  'matter.create': ['Eintrag', 'Einträge'],
};

/** follow-up steps (children) that an undo would also remove */
export async function folgenText(tx: Tx, actionId: string): Promise<string | undefined> {
  const r = await tx.execute<{ type: string; n: number }>(sql`
    SELECT type, count(*)::int AS n FROM actions WHERE parent_action_id = ${actionId} AND undone_at IS NULL GROUP BY type`);
  const teile = r.rows.map((c) => {
    const [one, many] = FOLGEN[c.type] ?? ['Folgeschritt', 'Folgeschritte'];
    return `${c.n} ${c.n === 1 ? one : many}`;
  });
  return teile.length ? `entfernt auch ${teile.join(', ')}` : undefined;
}

export async function karteFuer(tx: Tx, type: string, p: P, result: P, now: Date): Promise<Omit<Karte, 'actionId' | 'undoable' | 'folgen' | 'anweisung'>> {
  const id = s(result.id);
  const q = (t: string) => `„${kurz(t)}“`;
  const quittung = (punkt: string, link: Karte['link'] = null) => ({ art: 'quittung' as const, punkte: [punkt], link });
  const ziel = async (tt: unknown, tid: unknown) => {
    const t = tt as 'matter' | 'org' | 'person';
    return { text: (await name(tx, t, tid)) ?? 'öffnen', href: hrefFor(t, s(tid)) };
  };

  switch (type) {
    case 'note.create': {
      const z = await ziel(p.target_type, p.target_id);
      const conv = p.conversation as { art?: string; mit?: string } | undefined;
      const punkt = conv
        ? `${conv.art ?? 'Gespräch'}${conv.mit ? ` mit ${conv.mit}` : ''} notiert bei ${z.text}`
        : `Notiz bei ${z.text}: ${q(s(p.body_text))}`;
      return { ...quittung(punkt, z), privat: p.private === true };
    }
    case 'note.update':
      return quittung('Notiz geändert');
    case 'task.create': {
      const wer = p.direction === 'ours'
        ? (await name(tx, 'user', p.owner_user_id)) ?? 'uns'
        : (await name(tx, 'person', p.owner_person_id)) ?? (await name(tx, 'org', p.org_id)) ?? 'die andere Seite';
      const punkt = p.direction === 'ours'
        ? `Aufgabe für ${wer}: ${q(s(p.title))}${bis(p, now)}`
        : `Zusage von ${wer}: ${q(s(p.title))}${bis(p, now)}`;
      const link = p.matter_id ? await ziel('matter', p.matter_id) : p.org_id ? await ziel('org', p.org_id) : { text: 'Aufgaben', href: `/aufgaben?id=${id}` };
      return { ...quittung(punkt, link), privat: p.visibility === 'private' };
    }
    case 'task.update':
    case 'task.complete':
    case 'task.start':
    case 'task.reopen':
    case 'task.assign': {
      const t = (await name(tx, 'task', p.id)) ?? 'Aufgabe';
      const was = { 'task.update': 'geändert', 'task.complete': 'erledigt', 'task.start': 'in Arbeit', 'task.reopen': 'wieder offen', 'task.assign': 'neu zugewiesen' }[type];
      return quittung(`${q(t)} ${was}`, { text: 'Aufgaben', href: `/aufgaben?id=${s(p.id)}` });
    }
    case 'matter.create':
    case 'matter.create_from_previous': {
      const area = (await tx.execute<{ n: string }>(sql`SELECT a.name_singular AS n FROM matters m JOIN areas a ON a.id = m.area_id WHERE m.id = ${id}`)).rows[0]?.n ?? 'Eintrag';
      return quittung(`${area} ${q(s(p.title))} angelegt, noch ungeprüft`, { text: s(p.title), href: hrefFor('matter', id) });
    }
    case 'matter.update':
    case 'matter.set_status':
    case 'matter.assign':
    case 'matter.handover':
    case 'matter.handover_accept':
    case 'matter.handover_withdraw': {
      const was = {
        'matter.update': 'geändert', 'matter.set_status': p.status === 'done' ? 'erledigt' : 'wieder offen',
        'matter.assign': `zuständig: ${(await name(tx, 'user', p.owner_user_id)) ?? 'niemand'}`,
        'matter.handover': `Übergabe an ${(await name(tx, 'user', p.to_user_id)) ?? '?'} angeboten`,
        'matter.handover_accept': 'übernommen', 'matter.handover_withdraw': 'Übergabe zurückgezogen',
      }[type];
      const z = await ziel('matter', p.id);
      return quittung(`${q(z.text)} ${was}`, z);
    }
    case 'org.create':
      return quittung(`Organisation ${q(s(p.name))} angelegt, noch ungeprüft`, { text: s(p.name), href: hrefFor('org', id) });
    case 'org.update':
    case 'org.handover':
    case 'org.handover_accept':
    case 'org.handover_withdraw': {
      const z = await ziel('org', p.id);
      const was = { 'org.update': 'geändert', 'org.handover': `Übergabe an ${(await name(tx, 'user', p.to_user_id)) ?? '?'} angeboten`, 'org.handover_accept': 'übernommen', 'org.handover_withdraw': 'Übergabe zurückgezogen' }[type];
      return quittung(`${q(z.text)} ${was}`, z);
    }
    case 'person.create':
      return quittung(`Person ${q(s(p.name))} angelegt, noch ungeprüft`, { text: s(p.name), href: hrefFor('person', id) });
    case 'person.update':
    case 'person.add_email': {
      const z = await ziel('person', p.id ?? p.person_id);
      return quittung(type === 'person.add_email' ? `Adresse ${s(p.email)} bei ${z.text} ergänzt` : `${q(z.text)} geändert`, z);
    }
    case 'entry.link':
    case 'entry.relink': {
      const z = await ziel(p.target_type, p.target_id);
      return quittung(`Eintrag zugeordnet zu ${z.text}`, z);
    }
    case 'entry.unlink':
      return quittung('Zuordnung entfernt');
    case 'review.accept':
    case 'review.discard': {
      const n = Number(result.count ?? 0);
      return quittung(`${n} ${type === 'review.accept' ? 'übernommen' : 'verworfen'}`);
    }
    case 'instruction.create':
      return {
        art: 'anweisung',
        geltung: p.scope === 'personal' ? 'persoenlich' : 'team',
        punkte: [`${q(s(p.body_text))}${p.scope === 'area' ? ` – gilt für ${(await name(tx, 'area', p.area_id)) ?? 'den Bereich'}` : ''}`],
        link: { text: 'Anweisungen', href: '/einstellungen?reiter=Anweisungen' },
      };
    case 'instruction.update':
    case 'instruction.delete':
      return quittung(type === 'instruction.update' ? 'Anweisung geändert' : 'Anweisung gelöscht', { text: 'Anweisungen', href: '/einstellungen?reiter=Anweisungen' });
    case 'mail.draft': {
      const an = [...((p.to as string[]) ?? []), ...((p.cc as string[]) ?? [])].join(', ') || '(noch ohne Empfänger)';
      return {
        ...quittung(`Mail-Entwurf an ${an}`, { text: 'Entwurf öffnen', href: `/mail?entwurf=${id}` }),
        entwurf: { id, an, betreff: s(p.subject), auszug: kurz(s(p.body).replace(/\s+/g, ' '), 160) },
      };
    }
    case 'mail.draft_delete':
      return quittung('Entwurf verworfen');
    case 'mail.mark_read':
      return quittung(p.seen === false ? 'Als ungelesen markiert' : 'Als gelesen markiert');
    case 'mail.archive':
      return quittung('Archiviert', { text: 'Mail', href: '/mail' });
    case 'hint.dismiss':
    case 'hint.resolve':
      return quittung(type === 'hint.dismiss' ? 'Hinweis ausgeblendet' : 'Hinweis erledigt');
    case 'area.create':
    case 'area.update':
      return quittung(type === 'area.create' ? `Bereich ${q(s(p.name_plural))} angelegt` : 'Bereich geändert', { text: 'Bereiche', href: '/einstellungen?reiter=Bereiche' });
    default:
      return quittung('Eingetragen');
  }
}
