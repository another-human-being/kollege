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
