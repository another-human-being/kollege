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

test('Eingabe im Feld der Seitenleiste: Notiz, Zusage, Aufgabe – Karten mit Rückgängig', async ({ page }) => {
  await anmelden(page, 'Andreas');
  // E55: one field "Neuer Chat oder Suche" – Enter asks Kollege in a new chat
  const eingabe = page.getByLabel('Neuer Chat oder Suche');
  await eingabe.fill('Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber');
  await eingabe.press('Enter');
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);

  await expect(karte(page, 'Beratung mit Solaro notiert bei Solaro')).toBeVisible();
  await expect(karte(page, 'Zusage von Solaro: „Pitchdeck“')).toBeVisible();
  const aufgabe = karte(page, 'Aufgabe für Andreas: „Frau Weber vermitteln“');
  await expect(aufgabe).toBeVisible();
  await expect(page.getByText('Notiert.')).toBeVisible();

  // the chat is in the list on the chat page, titled by the first sentence (E62)
  const chatUrl = page.url();
  await page.goto('/chat');
  await expect(page.getByRole('region', { name: 'Deine Chats' }).getByRole('link', { name: /Gerade Beratung mit Solaro/ })).toBeVisible();
  await page.goto(chatUrl);

  await aufgabe.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(aufgabe).toContainText('Rückgängig gemacht');
  await page.reload();
  await expect(karte(page, 'Frau Weber vermitteln')).toContainText('Rückgängig gemacht');
  await expect(karte(page, 'Pitchdeck').getByRole('button', { name: /Rückgängig/ })).toBeVisible();

  // the record: the commitment is there, the undone task is not
  await page.goto('/b/founding_teams?id=' + (await solaroId(page)));
  // E59: one list "To-Dos", each row says who does it
  await expect(page.getByRole('region', { name: /To-Dos/ }).getByText(/^Pitchdeck( ·|$)/)).toBeVisible();
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
  await expect(page.getByRole('textbox', { name: 'Anweisung', exact: true })).toHaveValue(/Social-Media-Hinweise für mich nur montags/);
  // how the sentence was understood (decision 42)
  await expect(page.getByText('Wirkt auf alle Hinweise in Social Media: nur Mo')).toBeVisible();
});
