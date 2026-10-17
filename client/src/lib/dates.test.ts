import { describe, expect, it } from 'vitest';
import { formatMomentFromNow, formatYearMonth, localToday, monthsUntilYearMonth, yearMonthFromNow } from './dates';

// Every date here is built in local time, so the tests read the same in any time zone.
describe('browser-local dates', () => {
  it("names today's date as this browser sees it, late in the evening too", () => {
    expect(localToday(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    expect(localToday(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('gives the year and month a number of months from now', () => {
    // Oct 2026 + 14 months = Dec 2027; Oct 2026 + 3 = Jan 2027.
    expect(yearMonthFromNow(14, new Date(2026, 9, 31, 21))).toBe('2027-12');
    expect(yearMonthFromNow(3, new Date(2026, 9, 1))).toBe('2027-01');
  });

  it('says today, tomorrow or the weekday and date for a moment, with its time', () => {
    const now = new Date(2026, 10, 15, 10, 0); // Sun Nov 15, 2026, 10:00 am
    expect(formatMomentFromNow(new Date(2026, 10, 15, 21, 12).toISOString(), now)).toBe('today at 9:12 PM');
    expect(formatMomentFromNow(new Date(2026, 10, 16, 8, 5).toISOString(), now)).toBe('tomorrow at 8:05 AM');
    expect(formatMomentFromNow(new Date(2026, 10, 17, 21, 12).toISOString(), now)).toBe('on Tuesday, November 17 at 9:12 PM');
  });
});

describe('year-month months', () => {
  const october = new Date(2026, 9, 17);
  it('counts calendar months from this month', () => {
    expect(monthsUntilYearMonth('2026-10', october)).toBe(0);
    expect(monthsUntilYearMonth('2027-03', october)).toBe(5);
    expect(monthsUntilYearMonth('2026-09', october)).toBe(-1);
    expect(monthsUntilYearMonth('March', october)).toBeNull();
  });

  it('names a year-month for people', () => {
    expect(formatYearMonth('2027-03')).toBe('Mar 2027');
  });
});
