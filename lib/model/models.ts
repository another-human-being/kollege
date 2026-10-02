// Model roles (§9): which model stands behind "fast" and "think" is configuration only.
// MODEL_FAST / MODEL_THINK = "<provider>:<model id>", provider
//  - mistral (MISTRAL_API_KEY; EU endpoint unless MISTRAL_BASE_URL says otherwise),
//  - anthropic (ANTHROPIC_API_KEY),
//  - openai-compatible (MODEL_BASE_URL, MODEL_API_KEY – e.g. an EU host or vLLM).
// "skript" is the deterministic stand-in for tests and development without an API key
// (like the oracle for "fast" in stage 1); never in production.
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { withUser } from '@/lib/db/client';
import { modelCalls } from '@/lib/db/schema';
import { skriptModell } from './skript';

export type Role = 'fast' | 'think';

export const MISTRAL_EU = 'https://api.eu.mistral.ai/v1';

export function modelSpec(role: Role): string {
  const spec = process.env[role === 'fast' ? 'MODEL_FAST' : 'MODEL_THINK'];
  if (!spec) throw new Error(`MODEL_${role.toUpperCase()} is not set`);
  return spec;
}

export function getModel(role: Role): LanguageModel {
  const spec = modelSpec(role);
  if (spec === 'skript') {
    if (process.env.NODE_ENV === 'production') throw new Error('MODEL_THINK=skript is only for tests and development');
    return skriptModell();
  }
  const i = spec.indexOf(':');
  const provider = spec.slice(0, i);
  const id = spec.slice(i + 1);
  if (i < 1 || !id) throw new Error(`model spec "${spec}": expected <provider>:<model>`);
  // inference pinned to the EU by default (regional endpoint, Mistral docs "Regional Inference")
  if (provider === 'mistral') return createMistral({ baseURL: process.env.MISTRAL_BASE_URL || MISTRAL_EU })(id);
  if (provider === 'anthropic') return createAnthropic()(id);
  if (provider === 'openai-compatible') {
    const baseURL = process.env.MODEL_BASE_URL;
    if (!baseURL) throw new Error('MODEL_BASE_URL is not set');
    return createOpenAICompatible({ name: 'eu', baseURL, apiKey: process.env.MODEL_API_KEY })(id);
  }
  throw new Error(`model provider "${provider}" unknown`);
}

/** "provider:model" of the model actually used */
export function modelName(m: LanguageModel): string {
  return typeof m === 'string' ? m : `${m.provider}:${m.modelId}`;
}

export interface CallLog {
  userId: string;
  role: Role;
  model: string;
  purpose: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  error?: string;
}

/**
 * §9: every call is logged (role, model, tokens, duration, purpose) – never its content.
 * A failing log must not break the answer; it is reported on the console.
 */
export async function logCall(c: CallLog): Promise<void> {
  await withUser(c.userId, (tx) =>
    tx.insert(modelCalls).values({
      user_id: c.userId,
      role: c.role,
      model: c.model,
      purpose: c.purpose,
      input_tokens: c.inputTokens,
      output_tokens: c.outputTokens,
      duration_ms: Math.round(c.durationMs),
      error: c.error?.slice(0, 500),
    }),
  ).catch((e: unknown) => console.error('[model_calls]', e));
}
