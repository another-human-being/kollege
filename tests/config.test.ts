import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isFreemailDomain, isTeamAddress } from '@/lib/config';

describe('config', () => {
  it('team domain comes from TEAM_DOMAIN', () => {
    expect(isTeamAddress('Julia@Gruendung.Uni-Augsburg.example')).toBe(true);
    expect(isTeamAddress('hartmann@wiwi.uni-augsburg.example')).toBe(false);
  });

  it('freemail list comes from FREEMAIL_FILE (tests: fixtures/freemail.json)', () => {
    expect(isFreemailDomain('GMX.example')).toBe(true);
    expect(isFreemailDomain('solaro.example')).toBe(false);
  });

  it('the production list is valid and covers the big German providers', () => {
    const list = JSON.parse(readFileSync('config/freemail.json', 'utf8')) as string[];
    expect(list).toEqual(expect.arrayContaining(['gmx.de', 'web.de', 't-online.de', 'gmail.com', 'outlook.com']));
    expect(new Set(list).size).toBe(list.length);
  });
});
