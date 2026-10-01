import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // all DB tests share one test database – run files one after another
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://kollege:kollege@localhost:5432/kollege_test',
      BLOB_DIR: join(tmpdir(), 'kollege-test-blobs'),
      MODEL_FAST: 'oracle',
      TEAM_DOMAIN: 'gruendung.uni-augsburg.example',
      FREEMAIL_FILE: fileURLToPath(new URL('./fixtures/freemail.json', import.meta.url)),
      TZ: 'Europe/Berlin',
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
