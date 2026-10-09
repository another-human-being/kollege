// A real team (KOLLEGE_CONFIG): no test data, addresses as the login compares them.
import { describe, expect, it, vi } from 'vitest';

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
    expect(echt.users[0]!.email).toBe('deine-adresse@uni-augsburg.de');
    expect(echt.areas.map((a) => a.key)).toEqual(test.areas.map((a) => a.key));
    expect(test.testdaten).toBe(true);
  });
});
