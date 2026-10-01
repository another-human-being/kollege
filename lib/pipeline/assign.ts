// §7.2.2 Fixed assignment: facts, not guesses. Results are linked with origin 'rule'.
import { and, arrayContains, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { emailDomain, isFreemailDomain, isTeamAddress } from '@/lib/config';
import type { Tx } from '@/lib/db/client';
import { entries, links, orgs, people, personEmails } from '@/lib/db/schema';
import { participants } from './participants';

type Entry = typeof entries.$inferSelect;

export interface Fixed {
  people: string[];
  orgs: string[];
  matters: string[];
}

export async function fixedMatches(tx: Tx, entry: Entry): Promise<Fixed> {
  const external = [...new Set(participants(entry).filter((a) => !isTeamAddress(a)))];

  const peopleRows = external.length
    ? await tx
        .selectDistinct({ id: people.id })
        .from(personEmails)
        .innerJoin(people, eq(people.id, personEmails.person_id))
        .where(and(inArray(personEmails.email, external), isNull(people.merged_into_id)))
    : [];

  const domains = [...new Set(external.map(emailDomain).filter((d) => !isFreemailDomain(d)))];
  const orgRows = [];
  for (const d of domains) {
    orgRows.push(
      ...(await tx
        .select({ id: orgs.id })
        .from(orgs)
        .where(and(arrayContains(orgs.domains, [d]), isNull(orgs.merged_into_id)))),
    );
  }

  const matterIds = new Set<string>();
  if (entry.thread_key) {
    // matters of earlier entries in the same thread
    const rows = await tx
      .selectDistinct({ id: links.target_id })
      .from(links)
      .innerJoin(entries, eq(entries.id, links.entry_id))
      .where(and(eq(entries.thread_key, entry.thread_key), ne(entries.id, entry.id), eq(links.target_type, 'matter')));
    rows.forEach((r) => matterIds.add(r.id));
  }
  const path = (entry.meta as { path?: string }).path;
  if (entry.kind === 'file' && path?.includes('/')) {
    // a linked file in the same folder makes its matter a fixed candidate
    const folder = path.slice(0, path.lastIndexOf('/'));
    const rows = await tx
      .selectDistinct({ id: links.target_id })
      .from(links)
      .innerJoin(entries, eq(entries.id, links.entry_id))
      .where(
        and(
          eq(entries.kind, 'file'),
          ne(entries.id, entry.id),
          eq(links.target_type, 'matter'),
          sql`regexp_replace(${entries.meta}->>'path', '/[^/]*$', '') = ${folder}`,
        ),
      );
    rows.forEach((r) => matterIds.add(r.id));
  }

  return {
    people: peopleRows.map((r) => r.id),
    orgs: [...new Set(orgRows.map((r) => r.id))],
    matters: [...matterIds],
  };
}
