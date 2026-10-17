import { describe, expect, it } from 'vitest';
import { project, type ProjectionInput } from './projection';
import { ageInMonths, extraMonthlyToReach, monthNumberReached, retirementNumber } from './retirement';

function plan(overrides: Partial<ProjectionInput>): ProjectionInput {
  return { months: 120, monthlyIncome: 5_000, savingsMonthly: 0, debtMonthly: 0, investmentsMonthly: 0, goals: [], debts: [], accounts: [], ...overrides };
}
const cash = { id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 };

describe('retirement number', () => {
  it('is 25 times a year of spending, less other income', () => {
    // 4,000 a month = 48,000 a year; ÷ 4% = 1,200,000.
    expect(retirementNumber(4_000)).toBe(1_200_000);
    // Less 1,500 a month of Social Security: 2,500 × 12 ÷ 0.04 = 750,000.
    expect(retirementNumber(4_000, 1_500)).toBe(750_000);
    // Other income covering everything means nothing to save.
    expect(retirementNumber(2_000, 3_000)).toBe(0);
  });

  it('finds the first month invested money reaches it', () => {
    // 1,000 a month into a 0% account: 60,000 is reached in month 60.
    const result = project(plan({ investmentsMonthly: 1_000, accounts: [cash] }));
    expect(monthNumberReached(result, 60_000)).toBe(60);
    expect(monthNumberReached(result, 10_000_000)).toBeNull();
    expect(monthNumberReached(result, 0)).toBe(0);
  });

  it('gives the age in the calendar year a month lands in', () => {
    // October 2026, born 1990: 36 now; 3 months on is January 2027, so 37.
    const october = new Date(2026, 9, 17);
    expect(ageInMonths(1990, 0, october)).toBe(36);
    expect(ageInMonths(1990, 3, october)).toBe(37);
  });

  it('works out the extra a month that reaches the number in time', () => {
    // 0% account, 500 a month, 60,000 wanted by month 60: needs 1,000 a month, so 500 more.
    expect(extraMonthlyToReach(plan({ investmentsMonthly: 500, accounts: [cash] }), 60_000, 60)).toBe(500);
    // Already on track.
    expect(extraMonthlyToReach(plan({ investmentsMonthly: 1_000, accounts: [cash] }), 60_000, 60)).toBe(0);
    // No time left.
    expect(extraMonthlyToReach(plan({ accounts: [cash] }), 60_000, 0)).toBeNull();
  });
});
