// Stage 7 in the browser: folders of the drive, a file with its topic, summary and download.
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}

test('Ordner wählen, Datei öffnen: Zuordnung, Inhalt, Herunterladen', async ({ page }) => {
  await anmelden(page, 'Julia');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Dateien', exact: true }).click();
  await page.waitForURL('**/dateien');
  await page.getByRole('navigation', { name: 'Ordner' }).getByRole('link', { name: /Gründungsnacht 2026/ }).click();
  await expect(page.getByRole('heading', { name: 'Gründungsnacht 2026' })).toBeVisible();
  await page.getByRole('link', { name: /Ablaufplan\.docx/ }).click();
  await page.waitForURL(/d=/);
  await expect(page.getByRole('heading', { name: 'Ablaufplan.docx' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Gehört zu' }).getByRole('link', { name: /Gründungsnacht 2026/ })).toBeVisible();
  await expect(page.getByText('Worum es geht')).toBeVisible();
  await expect(page.getByText('für das Team')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Herunterladen' }).click()]);
  expect(download.suggestedFilename()).toBe('Ablaufplan.docx');
  await page.screenshot({ path: 'test-results/dateien.png', fullPage: true });
});

test('Anhänge aus fremden Postfächern bleiben unsichtbar', async ({ page }) => {
  await anmelden(page, 'Julia');
  await page.goto('/dateien?q=Finanzplan_Solaro_v2');
  await expect(page.getByText('Keine Dateien in dieser Ansicht.')).toBeVisible();
});
