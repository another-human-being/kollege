import type { z } from 'zod';
import type { ActionDef } from './types';

const registry = new Map<string, ActionDef>();

export function defineAction<S extends z.ZodType, R>(def: ActionDef<S, R>): ActionDef<S, R> {
  if (registry.has(def.type)) throw new Error(`action ${def.type} registered twice`);
  registry.set(def.type, def as unknown as ActionDef);
  return def;
}

export function getAction(type: string): ActionDef | undefined {
  return registry.get(type);
}

export function listActions(): ActionDef[] {
  return [...registry.values()];
}
