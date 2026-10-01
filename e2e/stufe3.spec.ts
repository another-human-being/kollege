// Acceptance stage 3 (§13), in the browser with the deterministic "skript" model:
// input on Heute → chat with cards and undo; a question with sources from a detail page;
// an instruction by chat. Every result is checked after a reload.
import { expect, test, type Page } from '@playwright/test';

async function anmelden(page: Page, name: string) {
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}

const karte = (page: Page, text: string | RegExp) => page.getByRole('group', { name: /Erledigt|Anweisung gespeichert/ }).filter({ hasText: text });

test('Eingabe auf Heute: Notiz, Zusage, Aufgabe – Karten mit Rückgängig', async ({ page }) => {
  await anmelden(page, 'Andreas');
  const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
  await eingabe.fill('Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber');
  await eingabe.press('Enter');
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);

  await expect(karte(page, 'Beratung mit Solaro notiert bei Solaro')).toBeVisible();
  await expect(karte(page, 'Zusage von Solaro: „Pitchdeck“')).toBeVisible();
  const aufgabe = karte(page, 'Aufgabe für Andreas: „Frau Weber vermitteln“');
  await expect(aufgabe).toBeVisible();
  await expect(page.getByText('Notiert.')).toBeVisible();

  // the chat is in the history, titled by the first sentence
  await expect(page.getByRole('link', { name: /Gerade Beratung mit Solaro/ })).toBeVisible();

  await aufgabe.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(aufgabe).toContainText('Rückgängig gemacht');
  await page.reload();
  await expect(karte(page, 'Frau Weber vermitteln')).toContainText('Rückgängig gemacht');
  await expect(karte(page, 'Pitchdeck').getByRole('button', { name: /Rückgängig/ })).toBeVisible();

  // the record: the commitment is there, the undone task is not
  await page.goto('/b/founding_teams?id=' + (await solaroId(page)));
  await expect(page.getByText('Pitchdeck', { exact: true })).toBeVisible();
  await expect(page.getByText('Frau Weber vermitteln')).toHaveCount(0);
});

async function solaroId(page: Page): Promise<string> {
  await page.goto('/b/founding_teams');
  const href = await page.getByRole('link', { name: /^Solaro/ }).first().getAttribute('href');
  return new URL(href!, 'http://x').searchParams.get('id')!;
}

test('Frage auf der Seite des Teams: Antwort mit Quellen', async ({ page }) => {
  await anmelden(page, 'Andreas');
  await page.goto('/b/founding_teams?id=' + (await solaroId(page)));
  const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
  await expect(page.getByText(/Solaro · \d+ Einträge/)).toBeVisible();
  await eingabe.fill('Was haben wir Solaro versprochen?');
  await eingabe.press('Enter');
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Kontakt zur IHK für Jury\/Mentoring prüfen/)).toBeVisible();
  const quelle = page.getByRole('link', { name: 'Beratungsprotokoll_22-09.docx' });
  await expect(quelle).toBeVisible();
  // the chat keeps its page as context
  await expect(page.getByText('Organisation · Solaro')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Beratungsprotokoll_22-09.docx' })).toBeVisible();
});

test('Anweisung per Chat', async ({ page }) => {
  await anmelden(page, 'Mehmet');
  await page.goto('/chat');
  const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
  await eingabe.fill('Ab jetzt: Social-Media-Hinweise für mich nur montags.');
  await eingabe.press('Enter');
  await expect(karte(page, 'Social-Media-Hinweise für mich nur montags.')).toContainText('Persönlich');
  await page.goto('/einstellungen?reiter=Anweisungen');
  await expect(page.getByText(/Social-Media-Hinweise für mich nur montags/)).toBeVisible();
});
