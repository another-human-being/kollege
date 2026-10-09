// Configuration.
//  - team: the addresses in the team configuration (users, aliases, team_adressen), optionally a
//    domain of its own (env TEAM_DOMAIN); freemail list: JSON file (env FREEMAIL_FILE,
//    default config/freemail.json) – decision 2026-10-01
//  - seed data (team, start areas): env KOLLEGE_CONFIG, default fixtures/config.json (the made-up
//    test team with its fixture sources, "testdaten": true). A real team: config/team.json (not in git).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export const AreaField = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1),
  type: z.enum(['text', 'date', 'person', 'number', 'select']),
  options: z.array(z.string()).optional(),
  /** value is copied by "aus Vorjahr" (matter.create_from_previous) */
  carry_over: z.boolean().optional(),
});

export const AreaConfig = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  name_singular: z.string().min(1),
  name_plural: z.string().min(1),
  description: z.string().default(''),
  matter_kind: z.enum(['org_based', 'dated', 'period', 'item']),
  fields: z.array(AreaField).max(5).default([]),
  phases: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
});

const adresse = z.email().transform((e) => e.trim().toLowerCase());

const TeamConfig = z.object({
  // addresses in lower case: login and mailbox owner compare them that way
  users: z.array(z.object({
    key: z.string(), name: z.string(), email: adresse, is_admin: z.boolean(),
    /** further addresses of the same person (e.g. name@uni-a.de and name@uni-augsburg.de) */
    aliases: z.array(adresse).default([]),
  })),
  /** fixture mailboxes (test data only); real mailboxes are connected with npm run quelle:imap */
  mailboxes: z.array(
    z.object({ key: z.string(), owner: z.string().nullable(), address: z.email(), team: z.boolean().optional() }),
  ).default([]),
  areas: z.array(AreaConfig),
  /** shared addresses of the team (e.g. the StartHub mailbox) – team, but no person */
  team_adressen: z.array(adresse).default([]),
  /** the made-up test data: the seed adds the fixture sources, dev:reset may wipe the database */
  testdaten: z.boolean().default(false),
});
export type TeamConfig = z.infer<typeof TeamConfig>;

// paths relative to the project directory: the same for app (Next bundles this file), worker and tests
export const fixturesDir = join(process.cwd(), 'fixtures');
const defaultFreemailFile = join(process.cwd(), 'config', 'freemail.json');

let cached: TeamConfig | undefined;

export function teamConfig(): TeamConfig {
  cached ??= TeamConfig.parse(JSON.parse(readFileSync(process.env.KOLLEGE_CONFIG || `${fixturesDir}/config.json`, 'utf8')));
  return cached;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

/**
 * Optional: a domain that belongs to the team alone (its own subdomain). Not for a domain the whole
 * university shares – then everyone there would count as team (finding 09.10.).
 */
export function teamDomain(): string | null {
  return process.env.TEAM_DOMAIN?.trim().toLowerCase() || null;
}

let adressen: Map<string, string> | undefined;

/** every team address → the person's main address (null for shared ones like the StartHub mailbox) */
function teamAdressen(): Map<string, string> {
  if (!adressen) {
    const cfg = teamConfig();
    adressen = new Map();
    for (const a of cfg.team_adressen) adressen.set(a, '');
    for (const u of cfg.users) for (const a of [u.email, ...u.aliases]) adressen.set(a, u.email);
  }
  return adressen;
}

/** the main address of a team member for any of their addresses; otherwise the address itself */
export function hauptadresse(email: string): string {
  const e = email.trim().toLowerCase();
  return teamAdressen().get(e) || e;
}

let freemail: Set<string> | undefined;

function freemailDomains(): Set<string> {
  freemail ??= new Set(
    z
      .array(z.string().min(3))
      .parse(JSON.parse(readFileSync(process.env.FREEMAIL_FILE || defaultFreemailFile, 'utf8')))
      .map((d) => d.toLowerCase()),
  );
  return freemail;
}

/** team = the addresses in the team configuration, plus the team domain if one is set */
export function isTeamAddress(email: string): boolean {
  const e = email.trim().toLowerCase();
  return teamAdressen().has(e) || (teamDomain() !== null && emailDomain(e) === teamDomain());
}

export function isFreemailDomain(domain: string): boolean {
  return freemailDomains().has(domain.toLowerCase());
}
