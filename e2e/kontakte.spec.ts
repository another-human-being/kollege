// Kontakte (10.10.): Organisation and Art as columns; on a contact, what it rests on – a click opens
// the mail at the bottom right, ‹ › goes through all, Escape closes.
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}

test('Kontakt: Spalten, Belege, Ansicht rechts unten', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/kontakte');
  const kopf = page.locator('.tkopf');
  await expect(kopf.getByText('Organisation', { exact: true })).toBeVisible();
  await expect(kopf.getByText('Art', { exact: true })).toBeVisible();
  const zeile = page.locator('.tz').filter({ hasText: 'Lisa Meier' });
  await expect(zeile).toContainText('Solaro');
  await zeile.click();

  const grundlage = page.getByRole('region', { name: 'Worauf das beruht' });
  await expect(grundlage).toBeVisible();
  const belege = grundlage.locator('.grundlage-zeile');
  const n = await belege.count();
  expect(n).toBeGreaterThan(0);
  await belege.first().click();
  const ansicht = page.getByRole('dialog');
  await expect(ansicht).toBeVisible();
  await expect(ansicht).toContainText(`1 / ${n}`);
  await expect(ansicht.locator('.beleg-text')).not.toBeEmpty();
  await expect(ansicht.getByRole('link', { name: /öffnen/ })).toBeVisible();
  if (n > 1) {
    await ansicht.getByRole('button', { name: 'Nächster Beleg' }).click();
    await expect(ansicht).toContainText(`2 / ${n}`);
  }
  await page.screenshot({ path: 'test-results/kontakt-belege.png', fullPage: false });
  await page.keyboard.press('Escape');
  await expect(ansicht).toHaveCount(0);
});
