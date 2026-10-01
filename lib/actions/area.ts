import { z } from 'zod';
import { AreaConfig } from '@/lib/config';
import { areas } from '@/lib/db/schema';
import { ALL_ACTORS, defined, updateWithInverse } from './helpers';
import { ActionError } from './types';
import { defineAction } from './registry';

export const areaCreate = defineAction({
  type: 'area.create',
  schema: AreaConfig.extend({ sort: z.number().int().default(0) }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, p) {
    const [row] = await tx.insert(areas).values(p).returning({ id: areas.id });
    return { result: { id: row!.id }, inverse: [{ op: 'delete', table: 'areas', id: row!.id }] };
  },
});

export const areaUpdate = defineAction({
  type: 'area.update',
  schema: AreaConfig.omit({ key: true }).partial().extend({ id: z.uuid(), sort: z.number().int().optional() }),
  external: false,
  allowedActors: ALL_ACTORS,
  async apply(tx, { id, ...p }) {
    const set = defined(p);
    if (!Object.keys(set).length) throw new ActionError('nothing to change');
    return { result: { id }, inverse: [await updateWithInverse(tx, areas, 'areas', id, set)] };
  },
});
