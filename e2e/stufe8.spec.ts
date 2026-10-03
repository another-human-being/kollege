// Stage 8 in the browser: an item on Heute put off with "Später" disappears until tomorrow,
// undo brings it back (the hints come from the run after the import, as the worker does after a sync).
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}
const toast = (page: Page) => page.getByRole('status').filter({ hasText: /✓|Das geht|Das ging/ });

test('Später: aus den Augen bis morgen, Rückgängig holt es zurück', async ({ page }) => {
  await anmelden(page, 'Andreas');
  const wartet = page.locator('section[aria-labelledby="h-wartet"]');
  const zeile = wartet.locator('article').filter({ hasText: 'Finanzplan v2' });
  await expect(zeile).toBeVisible();
  await page.screenshot({ path: 'test-results/heute-hinweise.png', fullPage: true });
  await zeile.getByRole('button', { name: 'Später' }).click();
  await expect(toast(page)).toContainText('Verschoben auf morgen');
  await expect(zeile).toHaveCount(0);
  await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
  await expect(zeile).toBeVisible();
});
