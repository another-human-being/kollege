// Stage 5 in the browser: read a thread, answer, send – and recall within 10 s (E43).
// The send job runs in the worker; here no worker runs, so nothing leaves – the recall is
// what the person sees and does. Sending itself is tested against SMTP in tests/mail.test.ts.
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}
const toast = (page: Page) => page.getByRole('status').filter({ hasText: /✓|Das geht|Das ging/ });

test('Mail lesen, antworten, senden und zurückholen', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/mail');
  await expect(page.getByRole('heading', { name: 'Mail' })).toBeVisible();
  const erste = page.locator('a.mz').first();
  await expect(erste).toBeVisible();
  await erste.click();
  await page.waitForURL(/t=/);
  await expect(page.getByRole('button', { name: 'Antworten', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Antworten', exact: true }).click();
  await page.waitForURL(/entwurf=/);
  await expect(page.getByLabel('Betreff')).toHaveValue(/^Re: /);
  await page.getByLabel('Text').fill('Danke, passt.');
  await expect(page.getByText('Entwurf gespeichert')).toBeVisible();

  await page.getByRole('button', { name: 'Über mein Postfach senden' }).click();
  await expect(toast(page)).toContainText('10 s zurückholbar');
  await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
  // recalled: back in the editor with the text
  await page.waitForURL(/entwurf=/);
  await expect(page.getByLabel('Text')).toHaveValue('Danke, passt.');
  await expect(page.getByText('Wird gerade gesendet.')).toHaveCount(0);
});

test('ohne Empfänger: Fehler am Feld, nichts wird gesendet', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/mail');
  await page.getByRole('button', { name: '+ Neue Mail' }).click();
  await page.waitForURL(/entwurf=/);
  await page.getByLabel('Betreff').fill('Test');
  await page.getByRole('button', { name: 'Über mein Postfach senden' }).click();
  await expect(page.getByText('Empfänger fehlt – an wen soll die Mail gehen?')).toBeVisible();
  // Enter in the text never sends
  await page.getByLabel('An', { exact: true }).fill('lisa@solaro.example');
  await page.getByLabel('Text').press('Enter');
  await expect(toast(page)).toHaveCount(0);
});
