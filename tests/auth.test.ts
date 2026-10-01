import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { devAuthorize } from '@/lib/auth/dev';
import { closeDb } from '@/lib/db/client';
import { seed } from '@/lib/db/seed';
import { NOW, resetDb } from './helpers';

beforeAll(async () => {
  await resetDb();
  await seed({ now: NOW });
});
afterAll(() => closeDb());

describe('dev login', () => {
  it('signs in a team member by address – only in development', async () => {
    const julia = await devAuthorize(' Julia@gruendung.uni-augsburg.example', 'development');
    expect(julia).toMatchObject({ name: 'Julia', email: 'julia@gruendung.uni-augsburg.example' });
    expect(await devAuthorize('julia@gruendung.uni-augsburg.example', 'production')).toBeNull();
    expect(await devAuthorize('julia@gruendung.uni-augsburg.example', 'test')).toBeNull();
  });

  it('refuses unknown addresses and garbage', async () => {
    expect(await devAuthorize('lisa@solaro.example', 'development')).toBeNull();
    expect(await devAuthorize(undefined, 'development')).toBeNull();
    expect(await devAuthorize("x' OR 1=1 --", 'development')).toBeNull();
  });
});
