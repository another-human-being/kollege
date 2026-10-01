// End-to-end tests of the core flows (§3: Playwright only for 3–4 core flows).
// Own database kollege_e2e, rebuilt from the fixtures before every run.
import { defineConfig } from '@playwright/test';

const env = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgres://kollege:kollege@localhost:5432/kollege_e2e',
  BLOB_DIR: '/tmp/kollege-e2e-blobs',
  MODEL_FAST: 'oracle',
  MODEL_THINK: 'skript',
  TEAM_DOMAIN: 'gruendung.uni-augsburg.example',
  FREEMAIL_FILE: 'fixtures/freemail.json',
  AUTH_SECRET: 'e2e-secret-0123456789abcdef0123456789',
  AUTH_TRUST_HOST: 'true',
  TZ: 'Europe/Berlin',
};

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3100',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    // a preinstalled Chromium (CI/sandbox); otherwise `npx playwright install chromium`
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm run dev:reset -- --ja && npx next dev -p 3100',
    url: 'http://localhost:3100/anmelden',
    timeout: 180_000,
    reuseExistingServer: false,
    env,
  },
});
