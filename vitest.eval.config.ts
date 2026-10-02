// `npm run eval:chat`: the stage-3 acceptance with the REAL model from .env (costs tokens).
// Runs only on request, never in `npm test`. Uses the test database, not the dev database.
import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import base from './vitest.config';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['evals/**/*.eval.ts'],
    testTimeout: 180_000,
    env: {
      ...base.test?.env,
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
