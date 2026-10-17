import { describe, expect, it } from 'vitest';
import { nextDueMonths } from './sinkingFund';

describe('next due month of a sinking fund', () => {
  const october = new Date(2026, 9, 17);
  it('counts to the saved due date while it is ahead', () => {
    expect(nextDueMonths({ targetDate: '2026-12-01', repeatMonths: 12 }, october)).toBe(2);
  });
  it('moves a bill due this month or earlier on to its next time round', () => {
    // Due this month: next is a year on.
    expect(nextDueMonths({ targetDate: '2026-10-05', repeatMonths: 12 }, october)).toBe(12);
    // Every 6 months from March 2025: Sep 2025, Mar 2026, Sep 2026 have gone; Mar 2027 is 5 months away.
    expect(nextDueMonths({ targetDate: '2025-03-01', repeatMonths: 6 }, october)).toBe(5);
  });
  it('is null for an ordinary goal', () => {
    expect(nextDueMonths({ targetDate: '2026-12-01', repeatMonths: null }, october)).toBeNull();
  });
});
