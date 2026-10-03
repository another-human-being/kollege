// Simulation part 1: a tour of every page as each person – desktop and phone. Every page is
// checked (hilfe.ts) and photographed; detail pages are reached by clicking the first entries
// of each list, as a person would. Also: every internal link found leads somewhere.
import { test } from '@playwright/test';
import { anmelden, lauscher, Protokoll, seitePruefen } from './hilfe';

const SEITEN = [
  '/heute', '/chat', '/mail', '/mail?p=alle', '/kalender', '/kalender?ansicht=monat', '/aufgaben', '/aufgaben?status=erledigt',
  '/dateien', '/kontakte', '/einstellungen', '/b/founding_teams', '/b/events', '/b/teaching', '/b/social',
];
/** links into a detail: the first two of each kind on the list pages */
const DETAIL = [/^\/m\//, /^\/o\//, /^\/p\//, /^\/b\/\w+\?id=/, /^\/mail\?.*\bt=/, /^\/dateien\?.*\bd=/, /^\/kalender\?.*\bt=/, /^\/aufgaben\?.*\b(id|t)=/, /^\/chat\/[0-9a-f-]{36}/];

test.describe.configure({ mode: 'serial' });

for (const person of ['Andreas', 'Julia', 'Mehmet']) {
  test(`Rundgang ${person} (Desktop)`, async ({ page }) => {
    const p = new Protokoll(`rundgang-${person.toLowerCase()}`);
    let wo = '';
    lauscher(page, p, () => wo);
    await page.setViewportSize({ width: 1280, height: 2000 });
    await anmelden(page, person);
    const gefunden = new Map<RegExp, string[]>();
    const alleLinks = new Set<string>();
    for (const url of SEITEN) {
      wo = `${person} ${url}`;
      const t0 = Date.now();
      const r = await page.goto(url);
      await page.waitForLoadState('networkidle');
      const ms = Date.now() - t0;
      p.pruefe((r?.status() ?? 0) < 400, 'Technik', wo, `Seite lädt (HTTP ${r?.status()})`);
      if (ms > 3000) p.befund('hinweis', 'Tempo', wo, `Seite brauchte ${ms} ms (Entwicklungsserver).`);
      p.schritt(wo, 'Seite geöffnet', true, ms);
      await seitePruefen(page, p, wo, `${person}-${url.replace(/[/?=&]+/g, '_')}`);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
      for (const h of hrefs) {
        alleLinks.add(h);
        const art = DETAIL.find((re) => re.test(h));
        if (art) gefunden.set(art, [...new Set([...(gefunden.get(art) ?? []), h])]);
      }
    }
    // details, as reached by a click
    for (const [, hrefs] of gefunden) {
      for (const h of hrefs.slice(0, 2)) {
        wo = `${person} ${h}`;
        const r = await page.goto(h);
        await page.waitForLoadState('networkidle');
        p.pruefe((r?.status() ?? 0) < 400, 'Technik', wo, 'Detail lädt');
        await seitePruefen(page, p, wo, `${person}-detail-${h.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}`);
      }
    }
    // every internal link leads somewhere (no 404, no error page)
    for (const h of [...alleLinks].filter((x) => !x.startsWith('/api/')).slice(0, 150)) {
      const r = await page.request.get(h);
      if (r.status() >= 400) p.befund('fehler', 'Navigation', `${person} Link ${h}`, `Link führt ins Leere (HTTP ${r.status()}).`);
    }
    p.speichern();
  });
}

test('Rundgang Andreas (Handy, 390 px)', async ({ page }) => {
  const p = new Protokoll('rundgang-handy');
  let wo = '';
  lauscher(page, p, () => wo);
  await page.setViewportSize({ width: 390, height: 1600 });
  await anmelden(page, 'Andreas');
  for (const url of ['/heute', '/mail', '/kalender', '/kalender?ansicht=monat', '/aufgaben', '/dateien', '/kontakte', '/b/founding_teams', '/b/events', '/einstellungen', '/chat']) {
    wo = `Handy ${url}`;
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await seitePruefen(page, p, wo, `handy-${url.replace(/\W+/g, '_')}`);
    // the main navigation must be reachable on a phone
    const menue = page.getByRole('button', { name: 'Menü' });
    if (p.pruefe(await menue.isVisible().catch(() => false), 'Bedienbarkeit', wo, 'Auf dem Handy führt ein Menü-Knopf zur Navigation.')) {
      await menue.click();
      p.pruefe(await page.getByRole('navigation', { name: 'Hauptnavigation' }).isVisible(), 'Bedienbarkeit', wo, 'Das Menü zeigt die Navigation.');
      await page.screenshot({ path: `test-results/simulation/bilder/handy-menue.png` });
      await page.getByRole('button', { name: 'Schließen' }).click();
    }
  }
  p.speichern();
});
