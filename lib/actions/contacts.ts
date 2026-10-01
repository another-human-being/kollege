import { z } from 'zod';
import { isFreemailDomain, teamConfig } from '@/lib/config';
import { orgs, people, personEmails } from '@/lib/db/schema';
import { ALL_ACTORS, reviewStateFor } from './helpers';
import { defineAction } from './registry';
import { ActionError } from './types';

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
    // domains are used for fixed assignment: never freemail, never the team itself (§7.2.2)
    for (const d of p.domains) {
      if (isFreemailDomain(d)) throw new ActionError(`freemail domain ${d} cannot belong to an organisation`);
      if (d === teamConfig().team_domain) throw new ActionError('the team domain cannot belong to an organisation');
    }
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

