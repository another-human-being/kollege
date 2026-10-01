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
