// Secrets in connections.config (§4.2): encrypted with APP_SECRET, never in plain text.
// AES-256-GCM (authenticated: a changed ciphertext fails instead of decrypting to garbage),
// key derived from APP_SECRET with scrypt, fresh random IV per value.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const PREFIX = 'enc:v1:';
let cached: { secret: string; key: Buffer } | undefined;

function key(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error('APP_SECRET is not set or shorter than 32 characters');
  if (cached?.secret !== secret) cached = { secret, key: scryptSync(secret, 'kollege:connections', 32) };
  return cached.key;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), data]).toString('base64');
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) throw new Error('value is not encrypted');
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}

export const isEncrypted = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIX);
