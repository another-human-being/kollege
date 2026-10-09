// Shared parts of the simulation: sign-in, a findings log, and the checks every page gets.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { e2eEnv } from '../playwright.config';

export const AUSGABE = 'test-results/simulation';
mkdirSync(`${AUSGABE}/bilder`, { recursive: true });

export type Schwere = 'fehler' | 'bruch' | 'hinweis';
export interface Befund { schwere: Schwere; bereich: string; wo: string; was: string }

export class Protokoll {
  befunde: Befund[] = [];
  schritte: { wo: string; was: string; ok: boolean; ms?: number }[] = [];
  constructor(private name: string) {}
  befund(schwere: Schwere, bereich: string, wo: string, was: string) { this.befunde.push({ schwere, bereich, wo, was }); }
  schritt(wo: string, was: string, ok: boolean, ms?: number) { this.schritte.push({ wo, was, ok, ms }); }
  /** a check that records instead of failing the run */
  pruefe(ok: boolean, bereich: string, wo: string, was: string, schwere: Schwere = 'fehler') {
    this.schritt(wo, was, ok);
    if (!ok) this.befund(schwere, bereich, wo, was);
    return ok;
  }
  speichern() { writeFileSync(`${AUSGABE}/${this.name}.json`, JSON.stringify({ befunde: this.befunde, schritte: this.schritte }, null, 2)); }
}

export async function anmelden(page: Page, name: string) {
  // a person change: the sign-in page sends someone signed in straight to Heute
  await page.context().clearCookies();
  await page.goto('/anmelden');
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL('**/heute');
}

export const toast = (page: Page) => page.getByRole('status').filter({ hasText: /✓|Das geht|Das ging/ });

/** the worker's hint run (daily and after each sync), against the e2e database */
export function hinweiseLauf(): string {
  return execSync('npx tsx lib/hinweise/cli.ts', { env: { ...process.env, ...e2eEnv }, encoding: 'utf8' }).trim();
}

/** listens for console errors, page errors and failed requests while a page is used */
export function lauscher(page: Page, p: Protokoll, wo: () => string) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Download|favicon|webpack-hmr|Fast Refresh/.test(m.text())) p.befund('fehler', 'Technik', wo(), `Konsole: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => p.befund('fehler', 'Technik', wo(), `Seitenfehler: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (r.status() >= 400 && u.host.startsWith('localhost') && !u.pathname.startsWith('/_next/webpack-hmr')) p.befund('fehler', 'Technik', wo(), `HTTP ${r.status()} ${u.pathname}`);
  });
}

const VERBOTEN: [RegExp, string][] = [
  [/\bVorgang\b|\bVorgänge\b|\bVorgangs\b/, 'Das Wort „Vorgang“ steht in der Oberfläche (harte Regel).'],
  [/\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date/, 'Technischer Rest im Text (undefined/NaN/Invalid Date).'],
  [/\bnull\b/, '„null“ im Text.'],
  [/Application error|Unhandled Runtime Error|Internal Server Error/, 'Fehlerseite statt Inhalt.'],
  [/\b(Submit|Cancel|Loading|Save(?!-the-Date)|Delete|Search)\b/, 'Englisches Wort in der Oberfläche.'],
];

/** what every page must satisfy: no errors, no leftovers, every control named, no sideways scrolling */
export async function seitePruefen(page: Page, p: Protokoll, wo: string, bild: string) {
  const text = await page.locator('body').innerText();
  for (const [re, was] of VERBOTEN) {
    const m = re.exec(text);
    if (m) p.befund(was.startsWith('Das Wort') ? 'bruch' : 'fehler', 'Sprache', wo, `${was} („…${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}…“)`);
  }
  const unbenannt = await page.evaluate(() => {
    const name = (el: Element) => {
      const h = el as HTMLElement;
      if (h.getAttribute('aria-label') || h.getAttribute('title')) return true;
      const by = h.getAttribute('aria-labelledby');
      if (by && by.split(' ').some((id) => document.getElementById(id)?.textContent?.trim())) return true;
      if ((h as HTMLInputElement).labels?.length) return true;
      if (h.tagName === 'INPUT' && ['hidden', 'submit', 'button'].includes((h as HTMLInputElement).type)) return true;
      return !!h.textContent?.trim();
    };
    return [...document.querySelectorAll('a[href], button, input, select, textarea')]
      .filter((el) => (el as HTMLElement).offsetParent !== null && !name(el))
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('href') ? `[${el.getAttribute('href')}]` : ''}`)
      .slice(0, 5);
  });
  if (unbenannt.length) p.befund('fehler', 'Bedienbarkeit', wo, `Bedienelemente ohne Namen (Screenreader): ${unbenannt.join(', ')}`);
  const doppelt = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].slice(0, 5);
  });
  if (doppelt.length) p.befund('hinweis', 'Technik', wo, `Doppelte IDs: ${doppelt.join(', ')}`);
  const quer = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (quer > 2) p.befund('fehler', 'Darstellung', wo, `Seite scrollt seitwärts (${quer} px) bei ${page.viewportSize()?.width} px Breite.`);
  // clipped instead of scrolling: content sticking out past the right edge of the screen
  const raus = await page.evaluate(() => [...document.querySelectorAll('.inhalt *')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right <= window.innerWidth + 2) return false;
      // inside something that scrolls sideways on purpose (calendar grid, wide tables)
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return false;
      }
      return (el as HTMLElement).innerText?.trim().length > 0 && el.children.length === 0;
    })
    .map((el) => (el as HTMLElement).innerText.trim().slice(0, 30)).slice(0, 4));
  if (raus.length) p.befund('fehler', 'Darstellung', wo, `Inhalt ragt über den rechten Rand hinaus (abgeschnitten) bei ${page.viewportSize()?.width} px: ${raus.join(' | ')}`);
  await page.screenshot({ path: `${AUSGABE}/bilder/${bild}.png`, fullPage: true, caret: 'initial' }); // 'hide' injects a style that can race hydration
}

/** a CalDAV calendar for Andreas, as `npm run quelle:kalender` would store it (never synced in the simulation) */
export function kalenderVerbinden() {
  execSync(`psql "${e2eEnv.DATABASE_URL}" -c "INSERT INTO connections (user_id, kind, provider, label, config)
    SELECT id, 'calendar', 'caldav', 'Kalender (iCloud)', jsonb_build_object('url', 'http://localhost:1/', 'user', 'andreas', 'password', 'enc:v1:x',
      'calendars', jsonb_build_array('http://localhost:1/andreas/kalender/'), 'address', email)
    FROM users WHERE name = 'Andreas' AND NOT EXISTS (SELECT 1 FROM connections WHERE provider = 'caldav')"`, { encoding: 'utf8' });
}
