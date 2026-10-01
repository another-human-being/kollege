// Oracle (stage 1): answers for the fast model from fixtures/expected.json
// (items[meta.fixture_key].model). Test keys (solaro, lisa, …) are translated to
// what a real model would return: ids of existing objects, names for owners.
import { readFileSync } from 'node:fs';
import { and, eq, inArray } from 'drizzle-orm';
import { fixturesDir, teamConfig } from '@/lib/config';
import type { Tx } from '@/lib/db/client';
import { areas, matters, orgs, personEmails } from '@/lib/db/schema';
import { FastOutput } from './schemas';

interface Expected {
  orgs: { key: string; name: string }[];
  people: { key: string; name: string; emails: string[] }[];
  matters: { key: string; area: string; title: string }[];
  items: Record<string, { model: OracleAnswer | null }>;
}
type KeyRef = { key: string };
type OracleAnswer = Record<string, unknown> & {
  matter: KeyRef | { new: Record<string, unknown> } | null;
  people: (KeyRef | { new: Record<string, unknown> & { org?: string } })[];
  org?: KeyRef | { new: Record<string, unknown> } | null;
  tasks: (Record<string, unknown> & { owner_hint?: string | null })[];
};

let expected: Expected | undefined;
const load = () => (expected ??= JSON.parse(readFileSync(`${fixturesDir}/expected.json`, 'utf8')) as Expected);

const isRef = (x: unknown): x is KeyRef => typeof x === 'object' && x !== null && 'key' in x;
const dropKey = ({ key: _k, ...rest }: Record<string, unknown>) => rest;

function catalog<T extends { key: string }>(list: T[], key: string, what: string): T {
  const found = list.find((x) => x.key === key);
  if (!found) throw new Error(`oracle: unknown ${what} key ${key}`);
  return found;
}

async function matterId(tx: Tx, key: string): Promise<string> {
  const m = catalog(load().matters, key, 'matter');
  const [row] = await tx
    .select({ id: matters.id })
    .from(matters)
    .innerJoin(areas, eq(areas.id, matters.area_id))
    .where(and(eq(matters.title, m.title), eq(areas.key, m.area)));
  if (!row) throw new Error(`oracle: matter ${key} does not exist (yet)`);
  return row.id;
}

async function personId(tx: Tx, key: string): Promise<string> {
  const p = catalog(load().people, key, 'person');
  const [row] = await tx
    .select({ id: personEmails.person_id })
    .from(personEmails)
    .where(inArray(personEmails.email, p.emails));
  if (!row) throw new Error(`oracle: person ${key} does not exist (yet)`);
  return row.id;
}

async function orgId(tx: Tx, key: string): Promise<string> {
  const o = catalog(load().orgs, key, 'org');
  const [row] = await tx.select({ id: orgs.id }).from(orgs).where(eq(orgs.name, o.name));
  if (!row) throw new Error(`oracle: org ${key} does not exist (yet)`);
  return row.id;
}

/** key of a user, person or org → its name, as a model would write it */
function nameOf(key: string): string {
  const e = load();
  return (
    teamConfig().users.find((u) => u.key === key)?.name ??
    e.people.find((p) => p.key === key)?.name ??
    e.orgs.find((o) => o.key === key)?.name ??
    key
  );
}

/** null = the oracle has no answer for this entry (e.g. metadata only) */
export async function oracleAnswer(tx: Tx, fixtureKey: string): Promise<FastOutput | null> {
  const item = load().items[fixtureKey];
  if (!item) throw new Error(`oracle: no item ${fixtureKey} in expected.json`);
  const a = item.model;
  if (!a) return null;

  const translated = {
    ...a,
    matter: a.matter === null ? null : isRef(a.matter) ? { id: await matterId(tx, a.matter.key) } : { new: dropKey(a.matter.new) },
    people: await Promise.all(
      a.people.map(async (p) =>
        isRef(p)
          ? { id: await personId(tx, p.key) }
          : { new: { ...dropKey(p.new), org: p.new.org ? nameOf(p.new.org) : undefined } },
      ),
    ),
    org: !a.org ? null : isRef(a.org) ? { id: await orgId(tx, a.org.key) } : { new: dropKey(a.org.new) },
    tasks: a.tasks.map((t) => ({ ...t, owner_hint: t.owner_hint ? nameOf(t.owner_hint) : null })),
  };
  return FastOutput.parse(translated);
}
