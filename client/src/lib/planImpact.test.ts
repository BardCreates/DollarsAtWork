import { describe, expect, it } from 'vitest';
import { comparePlans, planExpectedReturn } from './planImpact';
import { project, type ProjectionInput } from './projection';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

/** $1,000 owed at 12% APR (1% a month); freed debt money goes into an account that doesn't grow. */
function loanPlan(debtMonthly: number, overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    months: 24,
    monthlyIncome: 5_000,
    savingsMonthly: 0,
    debtMonthly,
    investmentsMonthly: 0,
    goals: [],
    debts: [{ id: 'card', balance: 1_000, apr: 12, minPayment: 25 }],
    accounts: [{ id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 }],
    ...overrides,
  };
}

describe('comparing two plans', () => {
  // Paying $100 a month: 910.00, 819.10, … cleared in month 11 with a last payment of 58.98488.
  //   Month 11 leaves 100 − 58.98488 = 41.01512 to invest, month 12 adds 100: net worth 141.01512 after a year.
  // Paying $200 a month: 1010 − 200 = 810; 818.10 − 200 = 618.10; 624.281 − 200 = 424.281;
  //   428.52381 − 200 = 228.52381; 230.8090481 − 200 = 30.8090481; month 6 owes 31.11713858 and is cleared.
  //   Month 6 leaves 200 − 31.11713858 = 168.88286142, months 7–12 add 6 × 200: net worth 1,368.88286142.
  const before = project(loanPlan(100));
  const after = project(loanPlan(200));

  it('reports how many months sooner the debt is gone', () => {
    const impact = comparePlans(before, after, 1);
    expect(impact.debtFree).toEqual({ before: 11, after: 6, monthsSooner: 5 });
  });

  it('reports the change in net worth at the chosen year', () => {
    const impact = comparePlans(before, after, 1);
    expect(impact.netWorth.before).toBeCloseTo(141.01512, 4);
    expect(impact.netWorth.after).toBeCloseTo(1_368.88286, 4);
    // 1,200 more paid in over the year, plus 27.87 less interest (58.98 − 31.12).
    expect(impact.netWorth.change).toBeCloseTo(1_227.86774, 4);
  });

  it('is negative when the change makes things worse', () => {
    const impact = comparePlans(after, before, 1);
    expect(impact.debtFree.monthsSooner).toBe(-5);
    expect(impact.netWorth.change).toBeCloseTo(-1_227.86774, 4);
  });

  it('an unchanged plan has no impact', () => {
    const impact = comparePlans(before, project(loanPlan(100)), 1);
    expect(impact.debtFree.monthsSooner).toBe(0);
    expect(impact.netWorth.change).toBe(0);
  });

  it('has no month count when one plan never clears the debt', () => {
    // $10 a month doesn't cover the first month's $10 of interest plus any balance: it never ends.
    const never = project(loanPlan(10));
    expect(never.debtFreeMonth).toBeNull();
    expect(comparePlans(never, after, 1).debtFree).toEqual({ before: null, after: 6, monthsSooner: null });
  });

  it('with no debt, both plans are debt-free today', () => {
    const none = project(loanPlan(0, { debts: [] }));
    expect(comparePlans(none, none, 1).debtFree).toEqual({ before: 0, after: 0, monthsSooner: 0 });
  });

  it('looks 10 years ahead by default and never past the end of a projection', () => {
    // These projections are only 24 months long, so "10 years" means their last month.
    const impact = comparePlans(before, after);
    // After 24 months: 141.01512 + 12 × 100 = 1,341.01512, and 1,368.88286 + 12 × 200 = 3,768.88286.
    expect(impact.netWorth.before).toBeCloseTo(1_341.01512, 4);
    expect(impact.netWorth.after).toBeCloseTo(3_768.88286, 4);
  });
});

describe("the plan's expected return", () => {
  it('weights each account by its share of the monthly amount', () => {
    // 60% at 7% and 40% at 5%: 0.6 × 7 + 0.4 × 5 = 6.2
    expect(planExpectedReturn([{ expectedReturn: 7, sharePercent: 60 }, { expectedReturn: 5, sharePercent: 40 }])).toBeCloseTo(6.2, 10);
  });

  it('scales shares that do not total 100', () => {
    // Shares 30 and 10 are 75% and 25%: 0.75 × 8 + 0.25 × 4 = 7
    expect(planExpectedReturn([{ expectedReturn: 8, sharePercent: 30 }, { expectedReturn: 4, sharePercent: 10 }])).toBeCloseTo(7, 10);
  });

  it('with no shares set, counts the accounts equally', () => {
    expect(planExpectedReturn([{ expectedReturn: 8, sharePercent: 0 }, { expectedReturn: 4, sharePercent: 0 }])).toBe(6);
  });

  it('with no accounts, uses the default 7%', () => {
    expect(planExpectedReturn([])).toBe(7);
  });
});
