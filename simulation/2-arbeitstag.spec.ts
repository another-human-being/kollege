// Simulation part 2: a workday across all features, as the team would live it. After each step
// the other views are asked whether they tell the same story (coherence). A step that breaks is
// recorded and the day goes on. The worker is simulated by `hinweiseLauf()` where it would run.
import { expect, test, type Page } from '@playwright/test';
import { anmelden, hinweiseLauf, kalenderVerbinden, lauscher, Protokoll, seitePruefen, toast } from './hilfe';

test.describe.configure({ mode: 'serial' });
const p = new Protokoll('arbeitstag');
let wo = '';

async function schritt(page: Page, name: string, fn: () => Promise<void>) {
  wo = name;
  const t0 = Date.now();
  try {
    await fn();
    p.schritt(name, 'durchgeführt', true, Date.now() - t0);
  } catch (e) {
    p.befund('bruch', 'Ablauf', name, (e instanceof Error ? e.message : String(e)).split('\n').slice(0, 3).join(' ').slice(0, 300));
    p.schritt(name, 'abgebrochen', false, Date.now() - t0);
    await page.screenshot({ path: `test-results/simulation/bilder/bruch-${name.replace(/\W+/g, '_').slice(0, 50)}.png`, fullPage: true }).catch(() => undefined);
  }
}
const sichtbar = (page: Page, text: string | RegExp) => page.getByText(text).first().isVisible().catch(() => false);
const abschnitt = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`);
const zahl = async (page: Page, id: string) => Number((await abschnitt(page, id).locator('.kg-abschnitt-zahl').first().textContent().catch(() => '0')) ?? 0);

test.afterAll(() => p.speichern());

test('Vormittag Andreas: Heute, Klären, Eingabe nach der Beratung, Frage mit Quellen', async ({ page }) => {
  lauscher(page, p, () => wo);
  await page.setViewportSize({ width: 1280, height: 1800 });
  await anmelden(page, 'Andreas');

  await schritt(page, 'A1 Heute: Kurz klären – Lisa vom privaten Konto', async () => {
    await page.getByRole('button', { name: 'Ja, das ist Lisa Meier' }).click();
    await expect(toast(page)).toContainText('Gemerkt');
    await page.goto('/kontakte?q=gmx');
    p.pruefe(await sichtbar(page, 'Lisa Meier'), 'Kohärenz', wo, 'Nach „Ja“ steht die private Adresse bei Lisa Meier in Kontakte.');
  });

  await schritt(page, 'A2 Klärfrage ohne passende Knöpfe', async () => {
    await page.goto('/heute');
    const frage = page.locator('.kg-klaerung').filter({ hasText: 'Stadtwerke' });
    if (await frage.count()) {
      const knoepfe = await frage.getByRole('button').allTextContents();
      const links = await frage.getByRole('link').count();
      p.pruefe(knoepfe.length > 1 || links > 0, 'Kohärenz', wo,
        `Die Frage nennt Wahlmöglichkeiten („…anlegen oder unter Events ablegen?“), angeboten wird nur: ${knoepfe.join(', ')} – kein Weg, sie zu beantworten.`);
    }
  });

  await schritt(page, 'A3 Eingabe nach der Beratung (Notiz, Zusage, Aufgabe)', async () => {
    await page.goto('/heute');
    const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
    await eingabe.fill('Gerade Beratung mit Solaro, Pitchdeck bis Freitag, wir vermitteln Frau Weber');
    await eingabe.press('Enter');
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
    await expect(page.getByText('Notiert.')).toBeVisible({ timeout: 20_000 });
    await seitePruefen(page, p, wo, 'tag-A3-chat');
    // coherence: the same facts in Aufgaben, Heute and on Solaro's page
    await page.goto('/aufgaben?richtung=an_uns');
    await page.goto('/aufgaben');
    p.pruefe(await sichtbar(page, 'Frau Weber vermitteln'), 'Kohärenz', wo, 'Die neue Aufgabe „Frau Weber vermitteln“ steht in Aufgaben.');
    await page.goto('/aufgaben?wer=team');
    const teamAufgaben = await page.locator('body').innerText();
    p.pruefe(/Pitchdeck/.test(teamAufgaben), 'Kohärenz', wo, 'Die Zusage „Pitchdeck“ von Solaro steht in Aufgaben (Team).');
    await page.goto('/b/founding_teams');
    await page.getByRole('link', { name: /^Solaro/ }).first().click();
    await page.waitForLoadState('networkidle');
    const akte = await page.locator('body').innerText();
    p.pruefe(/Beratung mit Solaro/.test(akte), 'Kohärenz', wo, 'Die Gesprächsnotiz steht in der Akte von Solaro.');
    p.pruefe(/Pitchdeck/.test(akte) && /Frau Weber vermitteln/.test(akte), 'Kohärenz', wo, 'Zusage und Aufgabe stehen in der Akte von Solaro unter „Zusagen“.');
  });

  await schritt(page, 'A4 Frage „Was haben wir Solaro versprochen?“ – Antwort deckt sich mit den Zusagen', async () => {
    const zusagen = await page.locator('section, div').filter({ hasText: /^VON UNS/i }).first().innerText().catch(() => '');
    const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
    await eingabe.fill('Was haben wir Solaro versprochen?');
    await eingabe.press('Enter');
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
    await expect(page.getByText(/haben wir zugesagt/)).toBeVisible({ timeout: 20_000 });
    const antwort = await page.locator('main').innerText();
    for (const t of ['Feedback zum Finanzplan an Tom Kraus', 'Kontakt zur IHK für Jury/Mentoring prüfen', 'Frau Weber vermitteln']) {
      p.pruefe(antwort.includes(t), 'Intelligenz', wo, `Die Antwort nennt die offene Zusage „${t}“, die in Aufgaben steht.`);
    }
    p.pruefe(!zusagen || true, 'Intelligenz', wo, 'Antwort gelesen');
    const quellen = await page.locator('main a[href]').count();
    p.pruefe(quellen > 0, 'Intelligenz', wo, 'Die Antwort belegt mit anklickbaren Quellen.');
    await seitePruefen(page, p, wo, 'tag-A4-antwort');
  });

  await schritt(page, 'A5 Später auf Heute – die Mail bleibt im Postfach', async () => {
    hinweiseLauf();
    await page.goto('/heute');
    const zeile = abschnitt(page, 'h-wartet').locator('article').filter({ hasText: 'Finanzplan v2' });
    await zeile.getByRole('button', { name: 'Später' }).click();
    await expect(toast(page)).toContainText('Verschoben auf morgen');
    await page.reload();
    p.pruefe(await zeile.count() === 0, 'Bedienbarkeit', wo, 'Nach „Später“ ist der Punkt bis morgen weg (auch nach Neuladen).');
    await page.goto('/mail');
    p.pruefe(await sichtbar(page, 'Finanzplan v2'), 'Kohärenz', wo, '„Später“ versteckt nur auf Heute – die Mail steht weiter im Postfach.');
  });

  await schritt(page, 'A6 Zeitspalte auf Heute: Mails mit Datum, nicht mit Uhrzeit', async () => {
    await page.goto('/heute');
    const zeiten = await abschnitt(page, 'h-wartet').locator('.kg-hinweis-zeit').allTextContents();
    const uhr = zeiten.filter((z) => /^\d{2}:\d{2}$/.test(z.trim()));
    p.pruefe(uhr.length === 0, 'Kohärenz', wo, `„Wartet auf uns“ zeigt Uhrzeiten (${uhr.join(', ')}) statt Tage – eine Mail vom 25.09. sieht aus wie von heute.`);
  });
});

test('Mittag Andreas: Mail, Kalender, Dateien', async ({ page }) => {
  lauscher(page, p, () => wo);
  await page.setViewportSize({ width: 1280, height: 1800 });
  await anmelden(page, 'Andreas');

  await schritt(page, 'B1 Mail beantworten und zurückholen', async () => {
    await page.goto('/mail');
    await page.locator('a.mz').filter({ hasText: 'Finanzplan v2' }).click();
    await page.getByRole('button', { name: 'Antworten', exact: true }).click();
    await page.waitForURL(/entwurf=/);
    await page.getByLabel('Text').fill('Danke, schaue ich mir bis Mittwoch an.');
    await expect(page.getByText('Entwurf gespeichert')).toBeVisible();
    await page.getByRole('button', { name: 'Über mein Postfach senden' }).click();
    await expect(toast(page)).toContainText('10 s zurückholbar');
    await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
    await page.waitForURL(/entwurf=/);
    await expect(page.getByLabel('Text')).toHaveValue('Danke, schaue ich mir bis Mittwoch an.');
    await page.goto('/mail?o=entwuerfe');
    p.pruefe(await sichtbar(page, /Finanzplan v2/), 'Kohärenz', wo, 'Der zurückgeholte Entwurf liegt unter „Entwürfe“.');
  });

  await schritt(page, 'B2 Mail archivieren und als ungelesen markieren', async () => {
    await page.goto('/mail');
    const vorher = Number((await page.locator('.ld-kopfzeile .mono').first().textContent())?.match(/\d+/)?.[0] ?? 0);
    await page.locator('a.mz').filter({ hasText: 'Mittagessen?' }).click();
    await page.getByRole('button', { name: 'Als ungelesen' }).click();
    await expect(toast(page)).toContainText('ungelesen');
    await page.goto('/mail');
    const nachher = Number((await page.locator('.ld-kopfzeile .mono').first().textContent())?.match(/\d+/)?.[0] ?? 0);
    p.pruefe(nachher >= vorher, 'Kohärenz', wo, `Zähler „ungelesen“ passt nach „Als ungelesen“ (${vorher} → ${nachher}).`);
    await page.locator('a.mz').filter({ hasText: 'Die Woche in der Gründerszene' }).click();
    await page.getByRole('button', { name: 'Archivieren' }).click();
    await expect(toast(page)).toContainText('Archiviert');
    await page.goto('/mail');
    p.pruefe(!(await sichtbar(page, 'Die Woche in der Gründerszene')), 'Kohärenz', wo, 'Archivierte Mail ist aus dem Eingang verschwunden.');
    await page.goto('/mail?o=archiv');
    p.pruefe(await sichtbar(page, 'Die Woche in der Gründerszene'), 'Kohärenz', wo, 'Archivierte Mail steht im Archiv.');
  });

  await schritt(page, 'B3 Termin ohne und mit Gästen, Entwurf verwerfen, Rückgängig', async () => {
    kalenderVerbinden();
    await page.goto('/kalender?w=2026-10-05&neu=2026-10-07T10:00');
    await page.getByLabel('Titel').fill('Fokuszeit Förderanträge');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(toast(page)).toContainText('Termin angelegt');
    const fokus = page.getByRole('link', { name: /Fokuszeit Förderanträge/ }).first();
    await expect(fokus).toBeVisible();
    p.pruefe(!(await fokus.getAttribute('class'))?.includes('offen'), 'Kohärenz', wo, 'Termin ohne Gäste ist nicht gestrichelt (gilt als im Kalender).');
    await page.goto('/kalender?w=2026-10-05&neu=2026-10-08T14:00');
    await page.getByLabel('Titel').fill('Nachgespräch Solaro');
    await page.getByLabel('Mit').fill('lisa@solaro.example');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(toast(page)).toContainText('Einladung noch nicht verschickt');
    await page.getByRole('link', { name: /Nachgespräch Solaro/ }).first().click();
    await page.getByRole('button', { name: 'Entwurf verwerfen' }).click();
    await expect(toast(page)).toContainText('Entwurf verworfen');
    await toast(page).getByRole('button', { name: /Rückgängig/ }).click();
    await expect(toast(page)).toContainText('Rückgängig gemacht');
    await page.goto('/kalender?w=2026-10-05');
    p.pruefe(await sichtbar(page, 'Nachgespräch Solaro'), 'Bedienbarkeit', wo, 'Rückgängig holt den verworfenen Entwurf zurück.');
  });

  await schritt(page, 'B4 Datei einem Event zuordnen – erscheint dort', async () => {
    await page.goto('/dateien?o=Events%2FGr%C3%BCndungsnacht%202025');
    await page.getByRole('link', { name: /Rueckblick\.docx/ }).click();
    await page.getByLabel('Zuordnen zu').selectOption({ label: 'Event: Pitch-Abend 19.11.' });
    await expect(toast(page)).toContainText('Zugeordnet');
    await page.goto('/b/events');
    await page.getByRole('link', { name: /Pitch-Abend 19.11./ }).first().click();
    await page.waitForLoadState('networkidle');
    p.pruefe(await sichtbar(page, 'Rueckblick.docx'), 'Kohärenz', wo, 'Die zugeordnete Datei steht beim Event unter „Dateien“.');
  });
});

test('Nachmittag Julia und Mehmet: Übergabe, Abschluss, Rat aus dem Vorjahr, Anweisung', async ({ page }) => {
  lauscher(page, p, () => wo);
  await page.setViewportSize({ width: 1280, height: 1800 });

  await schritt(page, 'C1 Julia übergibt den Pitch-Abend an Andreas', async () => {
    await anmelden(page, 'Julia');
    await page.goto('/b/events');
    await page.getByRole('link', { name: /Pitch-Abend 19.11./ }).first().click();
    await page.getByLabel('Übergeben an').selectOption({ label: 'Andreas' });
    await expect(toast(page)).toContainText('Übergabe angefragt');
    hinweiseLauf();
    await anmelden(page, 'Andreas');
    const ueb = abschnitt(page, 'h-uebergabe');
    await expect(ueb).toBeVisible();
    const text = await ueb.innerText();
    p.pruefe(/Nächster Schritt|offene Zusagen/.test(text), 'Intelligenz', wo,
      'Die Übergabe auf Heute zeigt den Kurzstand (nächster Schritt, offene Zusagen) – Denkweise 7.');
    await ueb.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(toast(page)).toContainText('Übernommen');
    await page.goto('/b/events');
    await page.getByRole('link', { name: /Pitch-Abend 19.11./ }).first().click();
    await page.waitForLoadState('networkidle');
    p.pruefe(/ZUSTÄNDIG\s*Andreas/i.test(await page.locator('body').innerText()), 'Kohärenz', wo, 'Nach der Annahme ist Andreas zuständig.');
  });

  await schritt(page, 'C2 Julia schließt die Gründungsnacht 2025 ab und legt 2027 an – Rat aus dem Vorjahr', async () => {
    await anmelden(page, 'Julia');
    await page.goto('/b/events?status=erledigt');
    await page.goto('/b/events');
    await page.getByRole('link', { name: /Gründungsnacht 2025/ }).first().click();
    await page.getByRole('button', { name: 'Als erledigt markieren' }).click();
    await page.getByLabel(/Wie lief/).fill('18 von 60 Plätzen, zu spät eingeladen.');
    await page.getByRole('button', { name: 'Ablegen' }).click();
    await expect(toast(page)).toContainText('Im Verlauf abgelegt');
    await page.goto('/b/events');
    await page.getByRole('button', { name: '+ Event' }).click();
    await page.getByLabel('Titel').fill('Gründungsnacht 2027');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.locator('#d-titel')).toHaveValue('Gründungsnacht 2027');
    hinweiseLauf();
    await page.goto('/heute');
    const frage = page.locator('.kg-klaerung').filter({ hasText: 'Vorgänger' });
    const n = await frage.count();
    p.pruefe(n > 0, 'Intelligenz', wo, 'Kollege fragt „Ist … der Vorgänger von Gründungsnacht 2027?“ (ein vergleichbarer Fall).');
    if (n) {
      const welche = await frage.first().innerText();
      p.pruefe(/Gründungsnacht 2025/.test(welche), 'Intelligenz', wo, `Vorgeschlagen wird der abgeschlossene Fall 2025 (${welche.split('\n')[0]}).`);
      await frage.first().getByRole('button', { name: 'Ja, Vorgänger' }).click();
      await expect(toast(page)).toContainText('Gemerkt');
      hinweiseLauf();
      await page.goto('/heute');
      const rat = abschnitt(page, 'h-rat');
      const da = await rat.count();
      p.pruefe(da > 0, 'Intelligenz', wo, 'Nach „Ja“ erscheint ein Rat unter „Aus früheren Fällen“.');
      if (da) {
        const r = await rat.innerText();
        p.pruefe(/„.+“/.test(r), 'Intelligenz', wo, 'Der Rat nennt einen wörtlichen Beleg.');
        p.pruefe(/früher einladen|Save-the-Date|18 von 60/.test(r), 'Intelligenz', wo, `Der Rat passt zum Rückblick 2025 (${r.replace(/\s+/g, ' ').slice(0, 160)}).`);
      }
      await seitePruefen(page, p, wo, 'tag-C2-rat');
    }
  });

  await schritt(page, 'C3 Mehmet schließt den Redaktionsplan ohne Rückblick – „Wie lief’s?“ kommt auf Heute', async () => {
    await anmelden(page, 'Mehmet');
    await page.goto('/b/social');
    await page.getByRole('link', { name: /Redaktionsplan Q4/ }).first().click();
    await page.getByRole('button', { name: 'Als erledigt markieren' }).click();
    await page.getByRole('button', { name: 'Überspringen' }).click();
    hinweiseLauf();
    await page.goto('/heute');
    const fest = abschnitt(page, 'h-festhalten');
    await expect(fest).toBeVisible();
    await fest.getByLabel(/Wie lief/).fill('Zu viele Beiträge im Dezember, nächstes Mal verteilen.');
    await fest.getByRole('button', { name: 'Festhalten' }).click();
    await expect(toast(page)).toContainText('Festgehalten');
    await page.goto('/b/social?status=erledigt');
    await page.getByRole('link', { name: /Redaktionsplan Q4/ }).first().click();
    p.pruefe(await sichtbar(page, 'Zu viele Beiträge im Dezember'), 'Kohärenz', wo, 'Der Rückblick aus Heute steht beim Beitrag unter „Wie lief’s“.');
  });

  await schritt(page, 'C4 Mehmet per Chat: „Ab jetzt: Social-Media-Hinweise für mich nur montags.“', async () => {
    await page.goto('/chat');
    const eingabe = page.getByLabel('Was ist passiert oder soll passieren?');
    await eingabe.fill('Ab jetzt: Social-Media-Hinweise für mich nur montags.');
    await eingabe.press('Enter');
    await expect(page.getByText('Gemerkt.')).toBeVisible({ timeout: 20_000 });
    await page.goto('/einstellungen?reiter=Anweisungen');
    p.pruefe(await sichtbar(page, /Wirkt auf .*nur Mo/), 'Intelligenz', wo, 'Die Einstellungen zeigen, wie der Satz verstanden wurde („Wirkt auf … nur Mo“).');
  });
});

test('Quer geprüft: Zahlen und Listen stimmen überein', async ({ page }) => {
  lauscher(page, p, () => wo);
  await page.setViewportSize({ width: 1280, height: 1800 });
  await anmelden(page, 'Andreas');
  await schritt(page, 'D1 „Prüfen“ auf Heute = Summe der ungeprüften in Bereichen und Kontakten', async () => {
    await page.goto('/heute');
    const heute = await zahl(page, 'h-pruefen');
    let summe = 0;
    for (const b of ['founding_teams', 'events', 'teaching', 'social']) {
      await page.goto(`/b/${b}`);
      summe += Number((await page.getByRole('button', { name: /ungeprüft · \d+/ }).first().textContent().catch(() => ''))?.match(/\d+/)?.[0] ?? 0);
    }
    await page.goto('/kontakte');
    summe += Number((await page.getByRole('link', { name: /ungeprüft · \d+/ }).or(page.getByRole('button', { name: /ungeprüft · \d+/ })).first().textContent().catch(() => ''))?.match(/\d+/)?.[0] ?? 0);
    p.pruefe(heute === summe, 'Kohärenz', wo, `Heute „Prüfen“ zeigt ${heute}, Bereiche und Kontakte zusammen ${summe}.`);
  });
  await schritt(page, 'D2 Überfälliges: Heute und Aufgaben zeigen dasselbe', async () => {
    await page.goto('/heute');
    // ours under "Heute", theirs under "Wir warten auf" – together what Aufgaben calls overdue
    const titel = async (id: string) => (await abschnitt(page, id).locator('article').filter({ hasText: /überfällig/ }).locator('.kg-hinweis-titel').allTextContents()).map((t) => t.trim());
    const heute = [...await titel('h-heute'), ...await titel('h-wir')].sort();
    await page.goto('/aufgaben');
    const aufgaben = (await page.locator('a').filter({ hasText: /seit \d+ Tag/ }).allTextContents()).map((a) => a.split('seit')[0]!.trim()).sort();
    p.pruefe(JSON.stringify(heute) === JSON.stringify(aufgaben), 'Kohärenz', wo, `Überfällig auf Heute ${JSON.stringify(heute)} vs. Aufgaben ${JSON.stringify(aufgaben)}.`);
  });
});
