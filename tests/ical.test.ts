// iCalendar for stage 6: read, change in place, invite, expand series.
import { describe, expect, it } from 'vitest';
import { einladung, geaenderterTermin, neuerTermin as neu, termineAus, vorkommen } from '@/lib/connectors/ical';

// iCalendar folds lines after 75 octets (RFC 5545 §3.1) – compare unfolded
const unfold = (s: string) => s.replace(/\r\n[ \t]/g, '');
const neuerTermin = (...a: Parameters<typeof neu>) => unfold(neu(...a));

const APPLE = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apple Inc.//macOS 16//EN',
  'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'DTSTART:19810329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'DTSTART:19961027T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT', 'UID:apple-1@icloud', 'DTSTAMP:20260930T080000Z', 'SEQUENCE:2',
  'DTSTART;TZID=Europe/Berlin:20261006T100000', 'DTEND;TZID=Europe/Berlin:20261006T113000',
  'SUMMARY:Beratung Solaro', 'LOCATION:Raum 2.14',
  'ORGANIZER;CN=Andreas:mailto:andreas@gruendung.uni-augsburg.example',
  'ATTENDEE;CN=Lisa Meier;PARTSTAT=ACCEPTED:mailto:Lisa@solaro.example',
  'ATTENDEE;CN=Tom Kraus;PARTSTAT=NEEDS-ACTION:mailto:tom@solaro.example',
  'RRULE:FREQ=WEEKLY;COUNT=3', 'EXDATE;TZID=Europe/Berlin:20261013T100000',
  'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC',
  'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', 'DESCRIPTION:Erinnerung', 'END:VALARM',
  'END:VEVENT', 'END:VCALENDAR', '',
].join('\r\n');

describe('iCalendar', () => {
  it('reads an Apple event with time zone, attendees and series', () => {
    const [t] = termineAus(APPLE);
    expect(t).toMatchObject({
      uid: 'apple-1@icloud', title: 'Beratung Solaro', location: 'Raum 2.14', allDay: false, sequence: 2,
      start: '2026-10-06T08:00:00.000Z', end: '2026-10-06T09:30:00.000Z',
      organizer: 'andreas@gruendung.uni-augsburg.example', rrule: 'FREQ=WEEKLY;COUNT=3',
      attendees: [{ email: 'lisa@solaro.example', name: 'Lisa Meier', status: 'zugesagt' }, { email: 'tom@solaro.example', name: 'Tom Kraus', status: 'offen' }],
    });
  });

  it('expands a series within a range, without the excluded date', () => {
    const [t] = termineAus(APPLE);
    const v = vorkommen(t!, new Date('2026-10-01T00:00:00Z'), new Date('2026-11-01T00:00:00Z'));
    expect(v.map((x) => x.start)).toEqual(['2026-10-06T08:00:00.000Z', '2026-10-20T08:00:00.000Z']);
  });

  it('changes an object in place: alarm and Apple extensions stay, sequence goes up', () => {
    const [t] = termineAus(APPLE);
    const neu = unfold(geaenderterTermin(APPLE, {
      uid: t!.uid, title: 'Beratung Solaro (verschoben)', start: '2026-10-07T08:00:00.000Z', end: '2026-10-07T09:00:00.000Z', allDay: false,
      organizer: { email: 'andreas@gruendung.uni-augsburg.example', name: 'Andreas' }, attendees: t!.attendees, location: 'Raum 2.14',
    }));
    expect(neu).toContain('BEGIN:VALARM');
    expect(neu).toContain('X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC');
    const [u] = termineAus(neu);
    expect(u).toMatchObject({ title: 'Beratung Solaro (verschoben)', start: '2026-10-07T08:00:00.000Z', sequence: 3 });
    // Kollege sends invitations itself: the server must not
    expect(neu).toMatch(/SCHEDULE-AGENT=CLIENT/);
  });

  it('new object: people not yet invited are not in the file; all-day is a date', () => {
    const ics = neuerTermin({
      uid: 'k-1@kollege', title: 'Gründungsnacht', start: '2026-11-20T00:00:00.000Z', end: '2026-11-21T00:00:00.000Z', allDay: true,
      organizer: { email: 'julia@gruendung.uni-augsburg.example' },
      attendees: [{ email: 'a.weber@ihk-schwaben.example', status: 'offen' }, { email: 'x@y.example', status: 'nicht_eingeladen' }],
    });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120');
    expect(ics).toContain('a.weber@ihk-schwaben.example');
    expect(ics).not.toContain('x@y.example');
    const [t] = termineAus(ics);
    expect(t).toMatchObject({ allDay: true, title: 'Gründungsnacht' });
  });

  it('an invitation carries METHOD and no scheduling hint', () => {
    const ics = neuerTermin({
      uid: 'k-2@kollege', title: 'Jury', start: '2026-11-19T17:00:00.000Z', end: '2026-11-19T19:00:00.000Z', allDay: false,
      organizer: { email: 'julia@gruendung.uni-augsburg.example' }, attendees: [{ email: 'a.weber@ihk-schwaben.example', status: 'offen' }],
    });
    const req = unfold(einladung(ics, 'REQUEST'));
    expect(req).toContain('METHOD:REQUEST');
    expect(req).not.toMatch(/SCHEDULE-AGENT/);
    expect(einladung(ics, 'CANCEL')).toContain('STATUS:CANCELLED');
  });
});
