// Dates for the interface (CLAUDE.md, design README): Europe/Berlin, relative when close
// ("heute", "gestern", "seit 9 Tagen"), otherwise 12.09. – no year within the current year.
import { berlinDate } from './time';

const TZ = 'Europe/Berlin';

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
}

export function uhrzeit(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "heute", "gestern", "morgen", "Mo 05.10.", "21.11.2025" */
export function tag(iso: string, now: Date): string {
  const d = new Date(iso);
  const diff = dayDiff(berlinDate(d), berlinDate(now));
  if (diff === 0) return 'heute';
  if (diff === -1) return 'gestern';
  if (diff === 1) return 'morgen';
  const sameYear = berlinDate(d).slice(0, 4) === berlinDate(now).slice(0, 4);
  if (sameYear && diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' }).format(d).replace(',', '');
  }
  return new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: 'numeric' }) }).format(d);
}

/** "heute 14:32", "gestern 09:10", "21.09." */
export function zeitpunkt(iso: string, now: Date): string {
  const t = tag(iso, now);
  return t === 'heute' || t === 'gestern' ? `${t} ${uhrzeit(iso)}` : t;
}

/** "seit 9 Tagen" (whole days in Berlin) */
export function seit(iso: string, now: Date): string {
  const n = -dayDiff(berlinDate(new Date(iso)), berlinDate(now));
  return n <= 0 ? 'seit heute' : n === 1 ? 'seit gestern' : `seit ${n} Tagen`;
}

/** due date of a task: "heute", "morgen", "überfällig seit 2 Tagen", "Fr 09.10." */
export function faellig(iso: string, now: Date): string {
  const diff = dayDiff(berlinDate(new Date(iso)), berlinDate(now));
  if (diff < 0) return diff === -1 ? 'seit gestern überfällig' : `seit ${-diff} Tagen überfällig`;
  return tag(iso, now);
}

/** "September 2026" – month headings in the history */
export function monat(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone: TZ, month: 'long', year: 'numeric' }).format(new Date(iso));
}
