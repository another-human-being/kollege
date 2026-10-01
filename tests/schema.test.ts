import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, withSystem, withUser } from '@/lib/db/client';
import { expectRejects } from './helpers';

afterAll(() => closeDb());

describe('schema', () => {
  it('app role without app.user_id sees nothing', async () => {
    await withSystem((tx) => tx.execute(sql`INSERT INTO users (name, email) VALUES ('X', 'x@schema.example')`));
    const rows = await withSystem(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE kollege_app`);
      return tx.execute(sql`SELECT count(*)::int AS n FROM users`);
    });
    expect(rows.rows[0]).toEqual({ n: 0 });
  });

  it('matters allow exactly one parent level', async () => {
    await expectRejects(
      withSystem(async (tx) => {
        const area = await tx.execute<{ id: string }>(
          sql`INSERT INTO areas (key, name_singular, name_plural, matter_kind) VALUES ('t', 'T', 'Ts', 'item') RETURNING id`,
        );
        const a = area.rows[0]!.id;
        const p = await tx.execute<{ id: string }>(sql`INSERT INTO matters (area_id, title) VALUES (${a}, 'P') RETURNING id`);
        const c = await tx.execute<{ id: string }>(
          sql`INSERT INTO matters (area_id, title, parent_id) VALUES (${a}, 'C', ${p.rows[0]!.id}) RETURNING id`,
        );
        await tx.execute(sql`INSERT INTO matters (area_id, title, parent_id) VALUES (${a}, 'G', ${c.rows[0]!.id})`);
      }),
      /only one level/,
    );
  });

  it('withUser sets the role and the user id', async () => {
    const r = await withUser('00000000-0000-0000-0000-000000000001', (tx) =>
      tx.execute(sql`SELECT current_user AS role, app_user_id() AS uid`),
    );
    expect(r.rows[0]).toEqual({ role: 'kollege_app', uid: '00000000-0000-0000-0000-000000000001' });
  });
});
