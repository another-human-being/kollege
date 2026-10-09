// Stage 6 in the browser: the week with the fixture events, a new event with attendees stays a
// dashed draft until "Einladung senden" (E10, E28), the end before the start is caught at the field.
// No worker runs here, so nothing reaches a calendar server – writing is tested against Radicale
// in tests/kalender.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { addDays, berlinDate, berlinWeekStart } from '../lib/time';
import pg from 'pg';

const DB = process.env.E2E_DATABASE_URL ?? 'postgres://kollege:kollege@localhost:5432/kollege_e2e';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}
const toast = (page: Page) => page.getByRole('status').filter({ hasText: /✓|Das geht|Das ging/ });

test.beforeAll(async () => {
  // a calendar connection for Andreas, as `npm run quelle:kalender` would store it (never synced here)
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  await c.query(`INSERT INTO connections (user_id, kind, provider, label, config)
    SELECT id, 'calendar', 'caldav', 'Kalender (Test)', jsonb_build_object('url', 'http://localhost:1/', 'user', 'andreas', 'password', 'enc:v1:x',
      'calendars', jsonb_build_array('http://localhost:1/andreas/kalender/'), 'address', email)
    FROM users WHERE name = 'Andreas'
      AND NOT EXISTS (SELECT 1 FROM connections WHERE provider = 'caldav')`);
  await c.end();
});

test('Woche zeigt Termine, neuer Termin mit Teilnehmenden bleibt Entwurf', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/kalender?w=2026-09-21');
  await expect(page.getByRole('link', { name: /Beratung Solaro/ }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/kalender-woche.png', fullPage: true });

  // the new event lies next week: an invitation only goes out for what is still to come
  const woche = berlinWeekStart(new Date(`${addDays(berlinDate(new Date()), 7)}T12:00:00Z`));
  await page.goto(`/kalender?w=${woche}&neu=${addDays(woche, 3)}T14:00`);
  await page.getByLabel('Titel').fill('Pitch-Probe Solaro');
  await page.getByLabel('Mit').fill('lisa@solaro.example');
  // end before start: caught at the field, nothing saved
  await page.getByLabel('Ende Uhrzeit').selectOption('13:00');
  await expect(page.getByText('Das Ende liegt vor dem Beginn.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anlegen' })).toBeDisabled();
  await page.getByLabel('Ende Uhrzeit').selectOption('15:00');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(toast(page)).toContainText('Einladung noch nicht verschickt');

  const termin = page.getByRole('link', { name: /Pitch-Probe Solaro/ }).first();
  await expect(termin).toBeVisible();
  await expect(termin).toHaveClass(/kal-termin--offen/);
  await termin.click();
  await page.waitForURL(/t=/);
  await expect(page.getByRole('button', { name: 'Einladung senden' })).toBeVisible();
  await expect(page.getByText('lisa@solaro.example')).toBeVisible();
  await page.screenshot({ path: 'test-results/kalender-detail.png', fullPage: true });

  await page.goto(`/kalender?ansicht=monat&m=${addDays(woche, 3).slice(0, 7)}`);
  await expect(page.getByRole('link', { name: 'Pitch-Probe Solaro' })).toBeVisible();
  await page.screenshot({ path: 'test-results/kalender-monat.png', fullPage: true });
});
