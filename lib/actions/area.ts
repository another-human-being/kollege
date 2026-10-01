import { z } from 'zod';
import { AreaConfig } from '@/lib/config';
import { areas } from '@/lib/db/schema';
import { ALL_ACTORS, defined, updateWithInverse } from './helpers';
import { ActionError } from './types';
import { defineAction } from './registry';

function slug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
}

export const areaCreate = defineAction({
  type: 'area.create',
  // from the settings only a name comes in: the key is derived, the singular starts as the name
  schema: z.preprocess(
    (raw) => {
      const r = raw as Record<string, unknown>;
      const name = typeof r?.name_plural === 'string' ? r.name_plural : '';
      return { name_singular: name, key: slug(name), ...r };
    },
    AreaConfig.extend({ sort: z.number().int().default(0) }),
  ),
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
