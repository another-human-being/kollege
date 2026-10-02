// Structured answer of the fast model – BAUVORLAGE §7.2.4.
import { z } from 'zod';

const Ref = z.object({ id: z.uuid() });

export const FastOutput = z.object({
  relevant: z.boolean(),
  area_key: z.string().nullable().optional(),
  matter: z
    .union([
      Ref,
      z.object({
        new: z.object({ title: z.string().min(1), area_key: z.string(), fields: z.record(z.string(), z.unknown()).default({}) }),
      }),
    ])
    .nullable(),
  people: z
    .array(
      z.union([
        Ref,
        z.object({ new: z.object({ name: z.string().min(1), email: z.email(), org: z.string().optional() }) }),
      ]),
    )
    .default([]),
  org: z
    .union([
      Ref,
      z.object({
        new: z.object({ name: z.string().min(1), role: z.enum(['founding_team', 'partner', 'university', 'other']).default('other') }),
      }),
    ])
    .nullable()
    .optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1),
        direction: z.enum(['ours', 'theirs']),
        /** name of the person/organisation that owes it */
        owner_hint: z.string().nullable().optional(),
        due: z.iso.date().nullable().optional(),
        /** literal evidence from the entry */
        quote: z.string(),
      }),
    )
    .default([]),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  question: z.string().optional(),
});
export type FastOutput = z.infer<typeof FastOutput>;

/**
 * The same answer, narrowed for one call of the real model: existing objects only from
 * the candidates, areas only from the configuration ("none / new" stays allowed). The model
 * cannot invent an ID – the oracle keeps the wide schema, it is the expected answer.
 */
export function fastOutputFor(c: { matters: { id: string }[]; people: { id: string }[]; orgs: { id: string }[] }, areaKeys: string[]) {
  const ref = (ids: string[]) => (ids.length ? [z.object({ id: z.enum(ids as [string, ...string[]]) })] : []);
  const area = z.enum(areaKeys as [string, ...string[]]);
  const one = <T extends z.ZodType>(opts: T[]) => (opts.length === 1 ? opts[0]! : z.union(opts as unknown as [T, T, ...T[]]));
  return z.object({
    relevant: z.boolean(),
    area_key: area.nullable().optional(),
    matter: one([
      ...ref(c.matters.map((m) => m.id)),
      z.object({ new: z.object({ title: z.string().min(1), area_key: area, fields: z.record(z.string(), z.unknown()).default({}) }) }),
    ]).nullable(),
    people: z.array(one([
      ...ref(c.people.map((p) => p.id)),
      z.object({ new: z.object({ name: z.string().min(1), email: z.email(), org: z.string().optional() }) }),
    ])).default([]),
    org: one([
      ...ref(c.orgs.map((o) => o.id)),
      z.object({ new: z.object({ name: z.string().min(1), role: z.enum(['founding_team', 'partner', 'university', 'other']).default('other') }) }),
    ]).nullable().optional(),
    tasks: FastOutput.shape.tasks,
    summary: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    question: z.string().optional(),
  });
}
