// Which organisation a contact belongs to (finding 10.10.: many contacts had none). Decided in
// code, in this order:
//  1. the domain of the address belongs to a known organisation (never freemail or the team);
//  2. an organisation of that name exists;
//  3. a name is known (from the mail or the web search): a new organisation, unreviewed, with
//     the domain for later fixed assignment.
// Without name and without a known domain: none – rather empty than guessed.
import { sql } from 'drizzle-orm';
import { runAction } from '@/lib/actions';
import { emailDomain, isFreemailDomain, isTeamAddress } from '@/lib/config';
import type { Tx } from '@/lib/db/client';

const SYSTEM = { type: 'system' } as const;

export type OrgRolle = 'founding_team' | 'partner' | 'university' | 'other';

/** a domain that may stand for an organisation */
export function eigeneDomain(email: string): string | null {
  const d = emailDomain(email);
  return isTeamAddress(email) || isFreemailDomain(d) ? null : d;
}

export async function orgFuer(tx: Tx, p: { email?: string; name?: string | null; rolle?: OrgRolle; reason?: string }): Promise<string | undefined> {
  const domain = p.email ? eigeneDomain(p.email) : null;
  if (domain) {
    const [o] = (await tx.execute<{ id: string }>(sql`
      SELECT id FROM orgs WHERE ${domain} = ANY (domains) AND review_state <> 'discarded' AND merged_into_id IS NULL
      ORDER BY review_state = 'accepted' DESC, created_at LIMIT 1`)).rows;
    if (o) return o.id;
  }
  const name = p.name?.trim();
  if (!name) return undefined;
  const [o] = (await tx.execute<{ id: string }>(sql`
    SELECT id FROM orgs WHERE lower(name) = ${name.toLowerCase()} AND review_state <> 'discarded' AND merged_into_id IS NULL
    ORDER BY review_state = 'accepted' DESC, created_at LIMIT 1`)).rows;
  if (o) return o.id;
  const r = await runAction<{ id: string }>(SYSTEM, 'org.create', { name, role: p.rolle ?? 'other', domains: domain ? [domain] : [] }, { tx, reason: p.reason });
  return r.result.id;
}
