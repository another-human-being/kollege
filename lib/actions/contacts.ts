import { z } from 'zod';
import { isFreemailDomain, teamDomain } from '@/lib/config';
import { orgs, people, personEmails } from '@/lib/db/schema';
import { assertUnowned } from './handover';
import { ALL_ACTORS, defined, reviewStateFor, updateWithInverse } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

/** domains are used for fixed assignment: never freemail, never the team itself (§7.2.2) */
function checkOrgDomain(d: string) {
  if (isFreemailDomain(d)) throw new ActionError(`freemail domain ${d} cannot belong to an organisation`);
  if (teamDomain() !== null && d === teamDomain()) throw new ActionError('the team domain cannot belong to an organisation');
}

const email = z.email().transform((e) => e.toLowerCase());
const emailSource = z.enum(['mail', 'calendar', 'manual']);

export const orgCreate = defineAction({
  type: 'org.create',
  schema: z.object({
    name: z.string().min(1),
    role: z.enum(['founding_team', 'partner', 'university', 'other']).default('other'),
    domains: z.array(z.string().min(3).transform((d) => d.toLowerCase())).default([]),
    owner_user_id: z.uuid().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, p, ctx) {
    for (const d of p.domains) checkOrgDomain(d);
    const [row] = await tx
      .insert(orgs)
      .values({ ...p, review_state: reviewStateFor(ctx.actor) })
      .returning({ id: orgs.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'orgs', id: row!.id }] };
  },
});

export const personCreate = defineAction({
  type: 'person.create',
  schema: z.object({
    name: z.string().min(1),
    org_id: z.uuid().optional(),
    role: z.enum(['founder', 'mentor', 'partner', 'speaker', 'university', 'other']).default('other'),
    notes: z.string().optional(),
    emails: z.array(z.object({ email, source: emailSource, confirmed: z.boolean().default(false) })).default([]),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { emails, ...p }, ctx) {
    const [row] = await tx
      .insert(people)
      .values({ ...p, review_state: reviewStateFor(ctx.actor) })
      .returning({ id: people.id });
    const id = row!.id;
    if (emails.length) await tx.insert(personEmails).values(emails.map((e) => ({ ...e, person_id: id })));
    // person_emails cascade on delete
    return { result: { id }, inverse: [{ op: 'delete', table: 'people', id }] };
  },
});

export const personAddEmail = defineAction({
  type: 'person.add_email',
  schema: z.object({ person_id: z.uuid(), email, source: emailSource, confirmed: z.boolean().default(false) }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, p) {
    const [row] = await tx.insert(personEmails).values(p).returning({ id: personEmails.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'person_emails', id: row!.id }] };
  },
});


export const personUpdate = defineAction({
  type: 'person.update',
  schema: z.object({
    id: z.uuid(),
    name: z.string().min(1).optional(),
    org_id: z.uuid().nullable().optional(),
    role: z.enum(['founder', 'mentor', 'partner', 'speaker', 'university', 'other']).optional(),
    notes: z.string().nullable().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, ...p }) {
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, people, 'people', id, set)] };
  },
});

export const orgUpdate = defineAction({
  type: 'org.update',
  schema: z.object({
    id: z.uuid(),
    name: z.string().min(1).optional(),
    role: z.enum(['founding_team', 'partner', 'university', 'other']).optional(),
    domains: z.array(z.string().min(3).transform((d) => d.toLowerCase())).optional(),
    phase: z.string().nullable().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    owner_user_id: z.uuid().nullable().optional(),
  }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, ...p }) {
    for (const d of p.domains ?? []) checkOrgDomain(d);
    if (p.owner_user_id !== undefined) await assertUnowned(tx, 'org', id); // "betreut von" only via handover (E45)
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, orgs, 'orgs', id, set)] };
  },
});

/** result of the web search about a person (decision 10.10.): what was found, with its sources */
export const personWeb = defineAction({
  type: 'person.web',
  schema: z.object({
    id: z.uuid(),
    web: z.object({
      am: z.iso.datetime({ offset: true }),
      status: z.enum(['gefunden', 'unklar', 'fehler']),
      organisation: z.string().nullable().optional(),
      art: z.enum(['founding_team', 'partner', 'university', 'other']).nullable().optional(),
      funktion: z.string().nullable().optional(),
      quellen: z.array(z.object({ url: z.url(), titel: z.string().nullable() })).optional(),
      fehler: z.string().optional(),
    }),
  }),
  external: false,
  allowedActors: ['system'],
  async apply(tx, { id, web }) {
    return { result: { id }, inverse: [await updateWithInverse(tx, people, 'people', id, { web })] };
  },
});
