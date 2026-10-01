// Team configuration (team domain, freemail list, team, mailboxes, start areas).
// Stage 1: read from fixtures/config.json – where it lives in production is an
// open question (docs/STAND.md).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const AreaField = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1),
  type: z.enum(['text', 'date', 'person', 'number', 'select']),
  options: z.array(z.string()).optional(),
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

const TeamConfig = z.object({
  team_domain: z.string().min(1),
  freemail_domains: z.array(z.string()),
  users: z.array(z.object({ key: z.string(), name: z.string(), email: z.email(), is_admin: z.boolean() })),
  mailboxes: z.array(
    z.object({ key: z.string(), owner: z.string().nullable(), address: z.email(), team: z.boolean().optional() }),
  ),
  areas: z.array(AreaConfig),
});
export type TeamConfig = z.infer<typeof TeamConfig>;

export const fixturesDir = fileURLToPath(new URL('../fixtures', import.meta.url));

let cached: TeamConfig | undefined;

export function teamConfig(): TeamConfig {
  cached ??= TeamConfig.parse(JSON.parse(readFileSync(`${fixturesDir}/config.json`, 'utf8')));
  return cached;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

export function isTeamAddress(email: string): boolean {
  return emailDomain(email) === teamConfig().team_domain;
}

export function isFreemailDomain(domain: string): boolean {
  return teamConfig().freemail_domains.includes(domain.toLowerCase());
}
