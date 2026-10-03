import { describe, expect, it } from 'vitest';
import { faellig, monat, seit, tag, zeitpunkt } from '@/lib/format';

const NOW = new Date('2026-10-01T08:00:00+02:00'); // Thursday

describe('dates in the interface', () => {
  it('is relative when close, without year in the current year', () => {
    expect(tag('2026-10-01T23:30:00+02:00', NOW)).toBe('heute');
    expect(tag('2026-09-30T00:10:00+02:00', NOW)).toBe('gestern');
    expect(tag('2026-10-02T09:00:00+02:00', NOW)).toBe('morgen');
    expect(tag('2026-10-05T09:00:00+02:00', NOW)).toBe('Mo. 05.10.');
    expect(tag('2026-09-21T10:12:00+02:00', NOW)).toBe('21.09.');
    expect(tag('2025-11-21T18:00:00+01:00', NOW)).toBe('21.11.2025');
  });

  it('uses Berlin days, not UTC days', () => {
    // 23:30 UTC on 30.09. is already 01.10. in Berlin
    expect(tag('2026-09-30T23:30:00Z', NOW)).toBe('heute');
    expect(zeitpunkt('2026-09-30T23:30:00Z', NOW)).toBe('heute 01:30');
  });

  it('counts days since and overdue', () => {
    expect(seit('2026-09-22T10:00:00+02:00', NOW)).toBe('seit 9 Tagen');
    expect(faellig('2026-09-29T23:59:59+02:00', NOW)).toBe('seit 2 Tagen überfällig');
    expect(faellig('2026-10-01T23:59:59+02:00', NOW)).toBe('heute');
    expect(monat('2026-09-21T10:12:00+02:00')).toBe('September 2026');
  });
});

import { payloadFor } from '@/lib/ziel';

describe('field changes as data', () => {
  it('puts the value at its path, converts numbers, empty means null', () => {
    expect(payloadFor({ type: 'matter.update', base: { id: 'm' }, key: 'fields.capacity', als: 'zahl' }, '60')).toEqual({ id: 'm', fields: { capacity: 60 } });
    expect(payloadFor({ type: 'matter.update', base: { id: 'm' }, key: 'title' }, 'Neu')).toEqual({ id: 'm', title: 'Neu' });
    const base = { id: 'o', fields: { next_step: 'alt', x: 1 } };
    expect(payloadFor({ type: 'org.update', base, key: 'fields.next_step' }, '')).toEqual({ id: 'o', fields: { next_step: null, x: 1 } });
    expect(base.fields.next_step).toBe('alt'); // base untouched
  });
});

describe('Berlin time for the calendar', async () => {
  const { berlinInstant, berlinMinutes, berlinWeekStart } = await import('@/lib/time');
  it('local time to an instant, across the switch to winter time', () => {
    expect(new Date(berlinInstant('2026-10-12', '09:30')).toISOString()).toBe('2026-10-12T07:30:00.000Z');
    expect(new Date(berlinInstant('2026-11-02', '09:30')).toISOString()).toBe('2026-11-02T08:30:00.000Z');
    expect(new Date(berlinInstant('2026-10-25', '12:00')).toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });
  it('minutes in Berlin and the Monday of a week', () => {
    expect(berlinMinutes(new Date('2026-10-12T07:30:00Z'))).toBe(570);
    expect(berlinWeekStart(new Date('2026-10-04T20:00:00Z'))).toBe('2026-09-28');
    expect(berlinWeekStart(new Date('2026-10-05T08:00:00Z'))).toBe('2026-10-05');
  });
});
