// Acceptance stage 2 (§13): create an event, change a field, check off a task, undo,
// take over / discard unreviewed items – also in bulk. Every result is checked after a reload.
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}

const toast = (page: Page) => page.getByRole('status').filter({ hasText: /✓|Das geht|Das ging/ });

test('Event anlegen, Feld ändern, Rückgängig', async ({ page }) => {
  await anmelden(page, 'Julia');
  await page.goto('/b/events');
  await page.getByRole('button', { name: '+ Event' }).click();
  await page.getByLabel('Titel').fill('Pitch-Training Oktober');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.locator('#d-titel')).toHaveValue('Pitch-Training Oktober');
  await expect(page.getByRole('link', { name: /Pitch-Training Oktober/ })).toBeVisible();

  // change a field: type, leave the field – saved
  await page.locator('#f-location').fill('Raum 2.14');
  await page.locator('#f-location').blur();
  await expect(toast(page)).toContainText('Gespeichert');
  await page.reload();
  await expect(page.locator('#f-location')).toHaveValue('Raum 2.14');

  // undo
  await page.locator('#f-location').fill('Hörsaal 1004');
  await page.locator('#f-location').blur();
  await expect(toast(page)).toContainText('Gespeichert');
  await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
  await expect(toast(page)).toContainText('Rückgängig gemacht');
  await page.reload();
  await expect(page.locator('#f-location')).toHaveValue('Raum 2.14');
});

test('Aufgabe abhaken und Rückgängig', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/aufgaben');
  await page.getByRole('link', { name: /Feedback zum Finanzplan/ }).click();
  await page.getByLabel('Verschieben nach').selectOption('done');
  await expect(toast(page)).toContainText('Erledigt');
  await page.goto('/aufgaben');
  await expect(page.getByRole('link', { name: /Feedback zum Finanzplan/ })).toHaveCount(0);
  await page.goto('/aufgaben?status=erledigt');
  await expect(page.getByRole('link', { name: /Feedback zum Finanzplan/ })).toBeVisible();

  // undo from the detail of the done task
  await page.getByRole('link', { name: /Feedback zum Finanzplan/ }).click();
  await page.getByLabel('Verschieben nach').selectOption('open');
  await expect(toast(page)).toContainText('Wieder offen');
  await page.goto('/aufgaben');
  await expect(page.getByRole('link', { name: /Feedback zum Finanzplan/ })).toBeVisible();
});

test('Ungeprüftes gesammelt übernehmen, Rückgängig, einzeln verwerfen', async ({ page }) => {
  await anmelden(page, 'Julia');
  await page.goto('/b/events?ungeprueft=1');
  await expect(page.getByRole('button', { name: 'ungeprüft · 3' })).toBeVisible();
  await page.getByLabel(/alle 3/).check();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(toast(page)).toContainText('3 übernommen');
  // one undo takes back the whole batch
  await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
  await expect(toast(page)).toContainText('Rückgängig gemacht');
  await page.reload();
  await expect(page.getByRole('button', { name: 'ungeprüft · 3' })).toBeVisible();
  await page.getByLabel(/alle 3/).check();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(toast(page)).toContainText('3 übernommen');
  await page.reload();
  await expect(page.getByRole('button', { name: 'ungeprüft · 0' })).toBeVisible();

  // after a reload the toast is gone – undo via a fresh bulk action instead: discard one with a reason
  await page.goto('/b/social?ungeprueft=1');
  await page.getByLabel('Redaktionsplan Q4 auswählen').check();
  await page.getByRole('button', { name: 'Verwerfen …' }).click();
  await page.getByLabel('Warum verwerfen?').fill('ist kein Beitrag, sondern ein Plan');
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(toast(page)).toContainText('1 verworfen');
  await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
  await expect(toast(page)).toContainText('Rückgängig gemacht');
  await page.reload();
  await expect(page.getByRole('button', { name: 'ungeprüft · 1' })).toBeVisible();
});

test('Kurz klären auf Heute beantworten', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.getByRole('button', { name: 'Ja, das ist Lisa Meier' }).click();
  await expect(toast(page)).toContainText('Gemerkt');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ja, das ist Lisa Meier' })).toHaveCount(0);
});

test('Sichtbarkeit: Andreas sieht Julias Mail nur als Platzhalter, ihre Zusage aber schon', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/b/events');
  await page.getByRole('link', { name: /Pitch-Abend 19.11./ }).click();
  await expect(page.getByText('Rückmeldung zur Jury-Anfrage')).toBeVisible();
  await expect(page.getByText(/aus Julias Mail/).first()).toBeVisible();
  await expect(page.getByText(/Inhalt nur für Julia/).first()).toBeVisible();
  await expect(page.getByText('Anfrage Jury Pitch-Abend am 19.11.')).toHaveCount(0);
});
