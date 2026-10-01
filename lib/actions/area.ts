import { z } from 'zod';
import { AreaConfig } from '@/lib/config';
import { areas } from '@/lib/db/schema';
import { ALL_ACTORS } from './helpers';
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
