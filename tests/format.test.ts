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
