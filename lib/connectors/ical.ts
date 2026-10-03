// iCalendar (RFC 5545) for the calendar connector: read events, change an existing object in
// place (unknown properties – alarms, Apple/Outlook extensions – stay as they were), create new
// ones, and build invitations (iMIP, RFC 6047). Uses ical.js (Mozilla).
import ICAL from 'ical.js';
import { berlinInstant } from '@/lib/time';

export type Teilnahme = 'zugesagt' | 'abgesagt' | 'vorbehalt' | 'offen' | 'nicht_eingeladen';

export interface Teilnehmer {
  email: string;
  name?: string;
  status: Teilnahme;
}

export interface Termin {
  uid: string;
  title: string | null;
  notes: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  organizer: string | null;
  attendees: Teilnehmer[];
  rrule: string | null;
  exdates: string[];
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  sequence: number;
}

const PARTSTAT: Record<string, Teilnahme> = {
  ACCEPTED: 'zugesagt', DECLINED: 'abgesagt', TENTATIVE: 'vorbehalt', 'NEEDS-ACTION': 'offen', DELEGATED: 'offen',
};
const mailto = (v: unknown) => (typeof v === 'string' ? v.replace(/^mailto:/i, '').toLowerCase() : null);

/** register the VTIMEZONEs of a file so that TZID times convert correctly */
function zones(root: ICAL.Component) {
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    const z = new ICAL.Timezone(tz);
    if (!ICAL.TimezoneService.has(z.tzid)) ICAL.TimezoneService.register(z);
  }
}

/** the master events of a file (overridden single occurrences are not read yet, STAND) */
export function termineAus(ics: string): Termin[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  zones(root);
  return root
    .getAllSubcomponents('vevent')
    .filter((v) => !v.hasProperty('recurrence-id'))
    .map((v) => {
      const e = new ICAL.Event(v);
      const allDay = e.startDate?.isDate ?? false;
      const end = e.endDate ?? e.startDate;
      const rrule = v.getFirstPropertyValue('rrule');
      return {
        uid: e.uid,
        title: e.summary ?? null,
        notes: e.description ?? null,
        location: e.location ?? null,
        start: e.startDate.toJSDate().toISOString(),
        end: end.toJSDate().toISOString(),
        allDay,
        organizer: mailto(v.getFirstPropertyValue('organizer')),
        attendees: v.getAllProperties('attendee').map((p) => ({
          email: mailto(p.getFirstValue()) ?? '',
          ...(p.getParameter('cn') ? { name: String(p.getParameter('cn')) } : {}),
          status: PARTSTAT[String(p.getParameter('partstat') ?? 'NEEDS-ACTION').toUpperCase()] ?? 'offen',
        })).filter((a) => a.email),
        rrule: rrule ? rrule.toString() : null,
        exdates: v.getAllProperties('exdate').flatMap((p) => p.getValues()).map((t) => (t as ICAL.Time).toJSDate().toISOString()),
        status: (String(v.getFirstPropertyValue('status') ?? 'CONFIRMED').toUpperCase() as Termin['status']),
        sequence: Number(v.getFirstPropertyValue('sequence') ?? 0),
      };
    });
}

export interface TerminDaten {
  uid: string;
  title: string;
  notes?: string | null;
  location?: string | null;
  start: string;
  end: string;
  allDay: boolean;
  organizer: { email: string; name?: string };
  /** only people who are invited (status ≠ nicht_eingeladen) go into the file */
  attendees: Teilnehmer[];
  status?: Termin['status'];
}

const UTC = (iso: string) => ICAL.Time.fromJSDate(new Date(iso), true);
const DATE = (iso: string) => {
  // all-day: the calendar day in Berlin
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  return ICAL.Time.fromDateString(d);
};
const p2 = (n: number) => String(n).padStart(2, '0');
/** the Berlin wall clock of an instant, as a floating time */
const WAND = (iso: string) => {
  const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  return ICAL.Time.fromDateTimeString(t.replace(' ', 'T'));
};
/** set a start or end; unchanged times stay as they were, a local time (TZID) stays local –
 *  written in UTC, a weekly series would move by an hour in winter in Apple/Outlook */
function zeit(v: ICAL.Component, name: 'dtstart' | 'dtend', iso: string, allDay: boolean, tzid: unknown) {
  const p = v.getFirstProperty(name);
  const alt = p?.getFirstValue() as ICAL.Time | undefined;
  if (alt && alt.isDate === allDay && (allDay ? alt.toString() === DATE(iso).toString() : alt.toJSDate().getTime() === new Date(iso).getTime())) return;
  const zone = !allDay && typeof tzid === 'string' && ICAL.TimezoneService.has(tzid) ? ICAL.TimezoneService.get(tzid) : null;
  const t = allDay ? DATE(iso) : zone ? UTC(iso).convertToZone(zone) : UTC(iso);
  const neu = v.updatePropertyWithValue(name, t);
  if (zone) neu.setParameter('tzid', tzid as string);
  else neu.removeParameter('tzid');
}
const PARTSTAT_ICS: Record<Teilnahme, string> = { zugesagt: 'ACCEPTED', abgesagt: 'DECLINED', vorbehalt: 'TENTATIVE', offen: 'NEEDS-ACTION', nicht_eingeladen: 'NEEDS-ACTION' };

function setzen(v: ICAL.Component, d: TerminDaten, opts: { serverSchedules: boolean }) {
  const set = (name: string, value: unknown) => {
    if (value === null || value === undefined || value === '') v.removeAllProperties(name);
    else v.updatePropertyWithValue(name, value as string);
  };
  set('summary', d.title);
  set('description', d.notes ?? null);
  set('location', d.location ?? null);
  const tzid = v.getFirstProperty('dtstart')?.getParameter('tzid');
  zeit(v, 'dtstart', d.start, d.allDay, tzid);
  v.removeAllProperties('duration');
  zeit(v, 'dtend', d.end, d.allDay, tzid);
  v.updatePropertyWithValue('dtstamp', ICAL.Time.now());
  v.updatePropertyWithValue('last-modified', ICAL.Time.now());
  v.updatePropertyWithValue('sequence', Number(v.getFirstPropertyValue('sequence') ?? 0) + 1);
  if (d.status) v.updatePropertyWithValue('status', d.status);
  const eingeladen = d.attendees.filter((a) => a.status !== 'nicht_eingeladen');
  v.removeAllProperties('organizer');
  v.removeAllProperties('attendee');
  if (eingeladen.length) {
    const org = v.addPropertyWithValue('organizer', `mailto:${d.organizer.email}`);
    if (d.organizer.name) org.setParameter('cn', d.organizer.name);
    for (const a of eingeladen) {
      const p = v.addPropertyWithValue('attendee', `mailto:${a.email}`);
      if (a.name) p.setParameter('cn', a.name);
      p.setParameter('partstat', PARTSTAT_ICS[a.status]);
      p.setParameter('rsvp', 'TRUE');
      // Kollege sends the invitations itself; the server must not send them again (RFC 6638)
      if (!opts.serverSchedules) p.setParameter('schedule-agent', 'CLIENT');
    }
  }
}

/** a new calendar object */
export function neuerTermin(d: TerminDaten): string {
  const cal = new ICAL.Component(['vcalendar', [], []]);
  cal.updatePropertyWithValue('prodid', '-//StartHub//Kollege//DE');
  cal.updatePropertyWithValue('version', '2.0');
  const v = new ICAL.Component('vevent');
  v.updatePropertyWithValue('uid', d.uid);
  v.updatePropertyWithValue('sequence', -1);
  setzen(v, d, { serverSchedules: false });
  cal.addSubcomponent(v);
  return cal.toString();
}

/** the existing object, changed in place */
export function geaenderterTermin(ics: string, d: TerminDaten): string {
  const cal = new ICAL.Component(ICAL.parse(ics));
  const v = cal.getAllSubcomponents('vevent').find((x) => !x.hasProperty('recurrence-id'));
  if (!v) throw new Error('no event in calendar object');
  zones(cal);
  setzen(v, d, { serverSchedules: false });
  return cal.toString();
}

/** the invitation or cancellation as a mail attachment (iMIP) */
export function einladung(ics: string, method: 'REQUEST' | 'CANCEL'): string {
  const cal = new ICAL.Component(ICAL.parse(ics));
  cal.updatePropertyWithValue('method', method);
  for (const v of cal.getAllSubcomponents('vevent')) {
    for (const p of v.getAllProperties('attendee')) p.removeParameter('schedule-agent');
    if (method === 'CANCEL') v.updatePropertyWithValue('status', 'CANCELLED');
  }
  return cal.toString();
}

/** occurrences of a series within [von, bis) – for the calendar view */
export function vorkommen(t: { start: string; end: string; rrule: string | null; exdates?: string[] }, von: Date, bis: Date): { start: string; end: string }[] {
  if (!t.rrule) return new Date(t.start) < bis && new Date(t.end) > von ? [{ start: t.start, end: t.end }] : [];
  // a series repeats at its local time (10:00 stays 10:00 after the switch to winter time):
  // expand on the Berlin wall clock, then each occurrence back to an instant
  const dauer = new Date(t.end).getTime() - new Date(t.start).getTime();
  const recur = ICAL.Recur.fromString(t.rrule);
  if (recur.until && !recur.until.isDate) recur.until = WAND(recur.until.toJSDate().toISOString());
  const it = recur.iterator(WAND(t.start));
  const aus = new Set((t.exdates ?? []).map((x) => new Date(x).getTime()));
  const out: { start: string; end: string }[] = [];
  for (let n = it.next(), i = 0; n && i < 1000; n = it.next(), i++) {
    const s = new Date(berlinInstant(`${n.year}-${p2(n.month)}-${p2(n.day)}`, `${p2(n.hour)}:${p2(n.minute)}`));
    if (s >= bis) break;
    if (s.getTime() + dauer > von.getTime() && !aus.has(s.getTime())) out.push({ start: s.toISOString(), end: new Date(s.getTime() + dauer).toISOString() });
  }
  return out;
}
