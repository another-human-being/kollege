// The simulation (not part of `npm run e2e`): a tour of every page as each person and a workday
// across all features, on a fresh e2e database. Findings go to test-results/simulation/.
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: 'simulation',
  timeout: 600_000,
  // a step that hangs fails fast and the day goes on
  use: { ...base.use, actionTimeout: 15_000, navigationTimeout: 30_000 },
  expect: { timeout: 10_000 },
  reporter: [['list']],
});
