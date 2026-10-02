// §4.2: secrets of connections are stored encrypted with APP_SECRET.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decrypt, encrypt, isEncrypted } from '@/lib/crypto';

afterEach(() => vi.unstubAllEnvs());
const SECRET = 'test-secret-0123456789abcdef0123456789';

describe('encrypt/decrypt', () => {
  it('round-trips, never contains the plain text, differs per call', () => {
    vi.stubEnv('APP_SECRET', SECRET);
    const a = encrypt('Passwort-123');
    expect(isEncrypted(a)).toBe(true);
    expect(a).not.toContain('Passwort');
    expect(encrypt('Passwort-123')).not.toBe(a);
    expect(decrypt(a)).toBe('Passwort-123');
  });

  it('fails with another APP_SECRET or a changed value', () => {
    vi.stubEnv('APP_SECRET', SECRET);
    const a = encrypt('geheim');
    vi.stubEnv('APP_SECRET', `${SECRET}-anders`);
    expect(() => decrypt(a)).toThrow();
    vi.stubEnv('APP_SECRET', SECRET);
    const b = Buffer.from(a.slice(7), 'base64');
    b[b.length - 1]! ^= 1;
    expect(() => decrypt(`enc:v1:${b.toString('base64')}`)).toThrow();
  });

  it('refuses without a long enough APP_SECRET', () => {
    vi.stubEnv('APP_SECRET', 'kurz');
    expect(() => encrypt('x')).toThrow(/APP_SECRET/);
  });
});
