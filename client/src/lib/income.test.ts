import { describe, expect, it } from 'vitest';
import { monthlyEquivalent } from './income';

describe('monthly equivalent of a paycheck', () => {
  it('spreads paychecks over the year', () => {
    // 1,800 every two weeks: 26 × 1,800 = 46,800 a year = 3,900 a month.
    expect(monthlyEquivalent(1_800, 'Biweekly')).toBeCloseTo(3_900, 6);
    // 600 a week: 52 × 600 = 31,200 a year = 2,600 a month.
    expect(monthlyEquivalent(600, 'Weekly')).toBeCloseTo(2_600, 6);
    expect(monthlyEquivalent(2_000, 'TwiceMonthly')).toBe(4_000);
    expect(monthlyEquivalent(6_000, 'Yearly')).toBe(500);
    expect(monthlyEquivalent(3_000, 'Monthly')).toBe(3_000);
    expect(monthlyEquivalent(2_500, 'Varies')).toBe(2_500);
  });
});
