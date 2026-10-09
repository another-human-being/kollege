import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
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

// A real team (KOLLEGE_CONFIG): no test data, addresses as the login compares them.
describe('Team-Konfiguration', () => {
  it('the example for a real team: no test data, address in lower case, the same areas as the test team', async () => {
    vi.stubEnv('KOLLEGE_CONFIG', 'config/team.example.json');
    vi.resetModules();
    const echt = (await import('@/lib/config')).teamConfig();
    vi.unstubAllEnvs();
    vi.resetModules();
    const test = (await import('@/lib/config')).teamConfig();
    expect(echt.testdaten).toBe(false);
    expect(echt.mailboxes).toEqual([]);
    expect(echt.users[0]!.email).toBe('vorname.nachname@uni-a.de');
    expect(echt.team_adressen).toEqual(['starthub@uni-augsburg.de']);
    expect(echt.areas.map((a) => a.key)).toEqual(test.areas.map((a) => a.key));
    expect(test.testdaten).toBe(true);
  });
});

describe('Team an Adressen statt an einer Domain (09.10.)', () => {
  it('a person with two addresses and the shared mailbox are team; the rest of the university is not', async () => {
    vi.stubEnv('KOLLEGE_CONFIG', 'config/team.example.json');
    vi.stubEnv('TEAM_DOMAIN', '');
    vi.resetModules();
    const { hauptadresse, isTeamAddress } = await import('@/lib/config');
    expect(isTeamAddress('Vorname.Nachname@uni-a.de')).toBe(true);
    expect(isTeamAddress('vorname.nachname@uni-augsburg.de')).toBe(true);
    expect(isTeamAddress('StartHub@uni-augsburg.de')).toBe(true);
    expect(isTeamAddress('prof.hartmann@uni-augsburg.de')).toBe(false);
    expect(hauptadresse('Vorname.Nachname@Uni-Augsburg.de')).toBe('vorname.nachname@uni-a.de');
    expect(hauptadresse('starthub@uni-augsburg.de')).toBe('starthub@uni-augsburg.de');
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
