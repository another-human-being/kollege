// §7.2.5 Gate: fixed matches or confidence high → apply silently (actor system);
// medium → apply, new objects stay unreviewed; low → apply nothing from the model,
// create a clarify hint instead. Every change goes through runAction.
import { randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import type { HintOption } from '@/lib/actions/hint';
import { emailDomain, isFreemailDomain, isTeamAddress } from '@/lib/config';
import type { Tx } from '@/lib/db/client';
import { areas, entries, orgs, people, personEmails, users } from '@/lib/db/schema';
import type { FastOutput } from '@/lib/model/schemas';
import { berlinEndOfDay } from '@/lib/time';
import type { Fixed } from './assign';
import type { Candidates } from './candidates';
import { senderOf } from './participants';

type Entry = typeof entries.$inferSelect;
const SYSTEM = { type: 'system' } as const;

export interface ApplyReport {
  /** model referenced an existing object that was not among the candidates (finding for stage 4) */
  notInCandidates: string[];
  clarifyHintId?: string;
}

export async function applyAssignment(
  tx: Tx,
  entry: Entry,
  fixed: Fixed,
  cands: Candidates,
  out: FastOutput | null,
): Promise<ApplyReport> {
  const report: ApplyReport = { notInCandidates: [] };
  const linked = new Set<string>();
  const link = async (type: 'matter' | 'person' | 'org', id: string, origin: 'rule' | 'model', confidence: 'high' | 'medium') => {
    if (linked.has(`${type}:${id}`)) return; // a fixed match wins over the same model suggestion
    linked.add(`${type}:${id}`);
    await runAction(SYSTEM, 'entry.link', { entry_id: entry.id, target_type: type, target_id: id, origin, confidence }, { tx });
  };

  for (const id of fixed.people) await link('person', id, 'rule', 'high');
  for (const id of fixed.orgs) await link('org', id, 'rule', 'high');
  for (const id of fixed.matters) await link('matter', id, 'rule', 'high');

  if (!out || !out.relevant) return report;
  if (out.confidence === 'low') {
    report.clarifyHintId = await clarify(tx, entry, cands, out);
    return report;
  }
  const conf = out.confidence;
  const candidateIds = new Set([...cands.matters, ...cands.people, ...cands.orgs].map((c) => c.id));
  const checkCandidate = (id: string) => {
    if (!candidateIds.has(id)) report.notInCandidates.push(id);
  };

  // organisation
  let orgId: string | undefined;
  let orgName: string | undefined;
  if (out.org && 'id' in out.org) {
    orgId = out.org.id;
    checkCandidate(orgId);
  } else if (out.org) {
    orgName = out.org.new.name;
    // domains for later fixed assignment: from the new people of this org, never freemail/team
    const domains = [
      ...new Set(
        out.people
          .flatMap((p) => ('new' in p && p.new.org === orgName ? [p.new.email] : []))
          .filter((e) => !isTeamAddress(e))
          .map(emailDomain)
          .filter((d) => !isFreemailDomain(d)),
      ),
    ];
    const r = await runAction<{ id: string }>(SYSTEM, 'org.create', { name: orgName, role: out.org.new.role, domains }, { tx, reason: out.summary });
    orgId = r.result.id;
  }
  if (orgId) await link('org', orgId, 'model', conf);

  const resolveOrg = async (name?: string): Promise<string | undefined> => {
    if (!name) return undefined;
    if (orgName && name.toLowerCase() === orgName.toLowerCase()) return orgId;
    const [o] = await tx.select({ id: orgs.id }).from(orgs).where(sql`lower(${orgs.name}) = ${name.toLowerCase()}`);
    return o?.id;
  };

  // people
  const personIds: string[] = [];
  for (const p of out.people) {
    let id: string;
    if ('id' in p) {
      id = p.id;
      checkCandidate(id);
    } else {
      const email = p.new.email.toLowerCase();
      const [known] = await tx.select({ id: personEmails.person_id }).from(personEmails).where(eq(personEmails.email, email));
      id = known
        ? known.id
        : (
            await runAction<{ id: string }>(
              SYSTEM,
              'person.create',
              {
                name: p.new.name,
                org_id: await resolveOrg(p.new.org),
                emails: [{ email, source: entry.kind === 'event' ? 'calendar' : 'mail' }],
              },
              { tx, reason: out.summary },
            )
          ).result.id;
    }
    personIds.push(id);
    await link('person', id, 'model', conf);
  }

  // matter
  let matterId: string | undefined;
  if (out.matter && 'id' in out.matter) {
    matterId = out.matter.id;
    checkCandidate(matterId);
  } else if (out.matter) {
    const [area] = await tx.select().from(areas).where(eq(areas.key, out.matter.new.area_key));
    const r = await runAction<{ id: string }>(
      SYSTEM,
      'matter.create',
      {
        area_key: out.matter.new.area_key,
        title: out.matter.new.title,
        fields: out.matter.new.fields,
        // topics of founding teams belong to the org (§4.3)
        org_id: area?.matter_kind === 'org_based' ? orgId : undefined,
      },
      { tx, reason: out.summary },
    );
    matterId = r.result.id;
  }
  if (matterId) await link('matter', matterId, 'model', conf);

  // tasks and commitments (shared with the team even if the entry is restricted, §5)
  const personNames = personIds.length
    ? await tx.select({ id: people.id, name: people.name }).from(people).where(inArray(people.id, personIds))
    : [];
  for (const t of out.tasks) {
    const owner = await resolveOwner(tx, t.direction, t.owner_hint ?? undefined, personNames, resolveOrg);
    await runAction(
      SYSTEM,
      'task.create',
      {
        title: t.title,
        direction: t.direction,
        owner_user_id: owner.userId,
        owner_person_id: owner.personId,
        due_at: t.due ? berlinEndOfDay(t.due) : undefined,
        matter_id: matterId,
        org_id: owner.orgId ?? orgId,
        source_entry_id: entry.id,
      },
      { tx, reason: t.quote },
    );
  }
  return report;
}

async function resolveOwner(
  tx: Tx,
  direction: 'ours' | 'theirs',
  hint: string | undefined,
  known: { id: string; name: string }[],
  resolveOrg: (name?: string) => Promise<string | undefined>,
): Promise<{ userId?: string; personId?: string; orgId?: string }> {
  if (!hint) return {};
  const h = hint.toLowerCase();
  if (direction === 'ours') {
    const [u] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.name}) = ${h} OR lower(${users.email}) = ${h}`);
    return { userId: u?.id };
  }
  const inEntry = known.find((p) => p.name.toLowerCase() === h);
  if (inEntry) return { personId: inEntry.id };
  const [p] = await tx
    .select({ id: people.id })
    .from(people)
    .where(sql`lower(${people.name}) = ${h} AND ${people.merged_into_id} IS NULL`);
  if (p) return { personId: p.id };
  // owed by an organisation as a whole (e.g. "Solaro schickt Pitchdeck")
  return { orgId: await resolveOrg(hint) };
}

/**
 * Clarify hint with 2–3 buttons (decision 2026-10-01: buttons are derived here, the
 * model only asks). For restricted entries the hint goes to a person who can see it.
 */
async function clarify(tx: Tx, entry: Entry, cands: Candidates, out: FastOutput): Promise<string> {
  const hintId = randomUUID();
  const options: HintOption[] = [];

  const sender = senderOf(entry);
  if (sender && !isTeamAddress(sender.email)) {
    const [known] = await tx.select().from(personEmails).where(eq(personEmails.email, sender.email));
    const first = (s?: string) => s?.trim().split(/\s+/)[0]?.toLowerCase();
    const same = cands.people.filter((p) => first(p.name) && first(p.name) === first(sender.name));
    // unknown address, exactly one candidate with that first name: "is this X?"
    if (!known && same.length === 1) {
      options.push({
        label: `Ja, das ist ${same[0]!.name}`,
        action_type: 'person.add_email',
        payload: { person_id: same[0]!.id, email: sender.email, source: 'mail', confirmed: true },
      });
    }
  }
  options.push({ label: options.length ? 'Nein' : 'Verwerfen', action_type: 'hint.dismiss', payload: { hint_id: hintId } });

  const [area] = out.area_key ? await tx.select({ id: areas.id }).from(areas).where(eq(areas.key, out.area_key)) : [];
  await runAction(
    SYSTEM,
    'hint.create',
    {
      id: hintId,
      user_id: entry.visibility === 'restricted' ? entry.visible_to[0] : undefined,
      kind: 'clarify',
      text: out.question ?? `Ich weiß nicht, wohin „${entry.title ?? 'dieser Eintrag'}“ gehört.`,
      reason: out.summary,
      area_id: area?.id,
      target_type: 'entry',
      target_id: entry.id,
      options,
      dedupe_key: `clarify:${entry.id}`,
    },
    { tx },
  );
  return hintId;
}
