// Field changes as plain data – see components/bearbeiten.tsx.
/**
 * What a field change does, as plain data (server components cannot pass functions):
 * the value goes into `base` at `key` ("title", "fields.capacity"); '' becomes null.
 */
export interface Ziel {
  type: string;
  base: Record<string, unknown>;
  key: string;
  als?: 'zahl' | 'text';
}

export function payloadFor(z: Ziel, value: string): Record<string, unknown> {
  const v: unknown = value.trim() === '' ? null : z.als === 'zahl' ? Number(value) : value;
  const out: Record<string, unknown> = structuredClone(z.base);
  const path = z.key.split('.');
  let o = out;
  for (const k of path.slice(0, -1)) o = (o[k] ??= {}) as Record<string, unknown>;
  o[path.at(-1)!] = v;
  return out;
}

