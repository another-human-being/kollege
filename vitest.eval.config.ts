// Runs with the REAL models from .env (costs tokens), only on request, never in `npm test`.
// Uses the test database, not the dev database.
//  npm run eval:chat         stage-3 acceptance with MODEL_THINK (evals/chat.eval.ts)
//  npm run eval:zuordnung    the expected.json checks of the fixture import with MODEL_FAST
//                            instead of the oracle: every failing check is a wrong assignment
import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import base from './vitest.config';

if (existsSync('.env')) process.loadEnvFile('.env');
const zuordnung = process.env.EVAL === 'zuordnung';
if (zuordnung && (!process.env.MODEL_FAST || process.env.MODEL_FAST === 'oracle')) {
  throw new Error('eval:zuordnung braucht ein echtes Modell in MODEL_FAST (.env), z. B. mistral:mistral-small-latest');
}

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: zuordnung ? ['tests/import.test.ts'] : ['evals/**/*.eval.ts'],
    testTimeout: 180_000,
    env: {
      ...base.test?.env,
      ...(zuordnung ? { MODEL_FAST: process.env.MODEL_FAST! } : {}),
      // the base config sets the test database and MODEL_FAST=oracle; the model for think comes from .env
      MODEL_THINK: process.env.MODEL_THINK ?? '',
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? '',
      MISTRAL_BASE_URL: process.env.MISTRAL_BASE_URL ?? '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
      MODEL_BASE_URL: process.env.MODEL_BASE_URL ?? '',
      MODEL_API_KEY: process.env.MODEL_API_KEY ?? '',
    },
  },
});
