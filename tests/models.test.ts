// Model roles are configuration only (§9). Mistral is pinned to the EU endpoint by default.
import { generateText } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getModel, modelName } from '@/lib/model/models';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getModel', () => {
  it('mistral: requests go to the EU endpoint unless MISTRAL_BASE_URL says otherwise', async () => {
    vi.stubEnv('MODEL_THINK', 'mistral:mistral-medium-3.5');
    vi.stubEnv('MISTRAL_API_KEY', 'test');
    vi.stubEnv('MISTRAL_BASE_URL', '');
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(String(url));
      return new Response('{}', { status: 500 });
    });
    const model = getModel('think');
    expect(modelName(model)).toBe('mistral.chat:mistral-medium-3.5');
    await generateText({ model, prompt: 'x', maxRetries: 0 }).catch(() => undefined);
    expect(urls).toEqual(['https://api.eu.mistral.ai/v1/chat/completions']);
  });

  it('rejects unknown providers and the skript stand-in in production', () => {
    vi.stubEnv('MODEL_THINK', 'irgendwas:x');
    expect(() => getModel('think')).toThrow(/unknown/);
    vi.stubEnv('MODEL_THINK', 'skript');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getModel('think')).toThrow(/only for tests/);
  });
});
