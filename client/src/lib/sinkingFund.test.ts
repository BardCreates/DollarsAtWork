import { describe, expect, it } from 'vitest';
import { nextDueMonths } from './sinkingFund';

describe('next due month of a sinking fund', () => {
  const october = new Date(2026, 9, 17);
  it('counts to the saved due date while it is ahead', () => {
    expect(nextDueMonths({ targetDate: '2026-12-01', repeatMonths: 12 }, october)).toBe(2);
  });
  it('keeps a bill due later this month in this month (0), so it is still paid', () => {
    expect(nextDueMonths({ targetDate: '2026-10-25', repeatMonths: 12 }, october)).toBe(0);
    // Today counts as still to pay.
    expect(nextDueMonths({ targetDate: '2026-10-17', repeatMonths: 12 }, october)).toBe(0);
  });
  it('is null for a date it cannot read', () => {
    expect(nextDueMonths({ targetDate: 'soon', repeatMonths: 12 }, october)).toBeNull();
  });
  it('moves a bill that has gone by on to its next time round', () => {
    // Due earlier this month: next is a year on.
    expect(nextDueMonths({ targetDate: '2026-10-05', repeatMonths: 12 }, october)).toBe(12);
    // Monthly from Sep 30: Oct 30 is still ahead this month (0). Monthly from Sep 5: Oct 5 has gone, so Nov 5 (1).
    expect(nextDueMonths({ targetDate: '2026-09-30', repeatMonths: 1 }, october)).toBe(0);
    expect(nextDueMonths({ targetDate: '2026-09-05', repeatMonths: 1 }, october)).toBe(1);
    // Every 6 months from March 2025: Sep 2025, Mar 2026, Sep 2026 have gone; Mar 2027 is 5 months away.
    expect(nextDueMonths({ targetDate: '2025-03-01', repeatMonths: 6 }, october)).toBe(5);
  });
  it('is null for an ordinary goal', () => {
    expect(nextDueMonths({ targetDate: '2026-12-01', repeatMonths: null }, october)).toBeNull();
  });
});
