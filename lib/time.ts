// Europe/Berlin helpers. Deadlines from the model are dates; due_at is a timestamp.
const TZ = 'Europe/Berlin';

/** YYYY-MM-DD of an instant in Berlin */
export function berlinDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** UTC offset of Berlin at the given instant, e.g. "+02:00" */
function berlinOffset(d: Date): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')!.value; // "GMT+02:00"
  return name === 'GMT' ? '+00:00' : name.slice(3);
}

/** a deadline "bis 30.09." means until the end of that day in Berlin */
export function berlinEndOfDay(date: string): string {
  const noon = new Date(`${date}T12:00:00Z`);
  return `${date}T23:59:59${berlinOffset(noon)}`;
}

/** minutes since midnight in Berlin (calendar grid) */
export function berlinMinutes(d: Date): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).split(':');
  return Number(h) * 60 + Number(m);
}

/** "2026-10-12" + "09:30" in Berlin → ISO with the offset valid then (summer/winter time) */
export function berlinInstant(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  // the offset at that local time; a second pass settles the switch days
  let iso = `${date}T${time}:00${berlinOffset(guess)}`;
  iso = `${date}T${time}:00${berlinOffset(new Date(iso))}`;
  return iso;
}

/** Monday of the week (Berlin) as YYYY-MM-DD */
export function berlinWeekStart(d: Date): string {
  const day = new Date(`${berlinDate(d)}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** n working days after a day (YYYY-MM-DD), Saturdays and Sundays skipped; public holidays not (yet) known */
export function werktagPlus(day: string, n: number): string {
  let d = day;
  for (let i = 0; i < n;) {
    d = addDays(d, 1);
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) i++;
  }
  return d;
}
