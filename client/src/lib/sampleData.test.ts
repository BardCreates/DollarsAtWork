import { describe, expect, it } from 'vitest';
import { comparePlans } from './planImpact';
import { project } from './projection';
import { SAMPLE_NAMES, SAMPLE_RETIREMENT, sampleInput } from './sampleData';

describe('the demo plan', () => {
  const base = project(sampleInput());

  it("starts from the numbers the page describes", () => {
    // Savings (300 + 2,500) + 401(k) 18,000 − debts (4,200 + 13,500 = 17,700) = 3,100.
    expect(base.points[0].netWorth).toBe(3_100);
    expect(base.points[0].debt).toBe(17_700);
  });

  it('is a sound plan: the debt budget covers the minimums and every debt gets paid off', () => {
    // Minimums are 110 + 310 = 420 against a 650 budget.
    expect(base.warnings.debtBudgetBelowMinimums).toBe(false);
    expect(base.debtFreeMonth).not.toBeNull();
    expect(base.debtFreeMonth!).toBeGreaterThan(0);
    expect(base.debtFreeMonth!).toBeLessThan(120);
  });

  it('has one name for every debt and goal, in order', () => {
    const input = sampleInput();
    expect(SAMPLE_NAMES.debts).toHaveLength(input.debts.length);
    expect(SAMPLE_NAMES.goals).toHaveLength(input.goals.length);
  });

  it('with no extra money, "move a dollar" changes nothing', () => {
    const impact = comparePlans(base, project(sampleInput(0)));
    expect(impact.debtFree.monthsSooner).toBe(0);
    expect(impact.netWorth.change).toBe(0);
  });

  it('putting more toward debt clears it sooner and leaves more in ten years', () => {
    const impact = comparePlans(base, project(sampleInput(200)));
    expect(impact.debtFree.monthsSooner!).toBeGreaterThan(0);
    expect(impact.netWorth.change).toBeGreaterThan(0);
  });

  it('never takes a negative extra to mean less than the budget', () => {
    expect(sampleInput(-100).debtMonthly).toBe(650);
  });
});

describe('the demo shows the newer features', () => {
  // Actual dollars here, so the hand-worked amounts aren't shrunk by inflation.
  const nominal = { ...sampleInput(), todaysDollars: false };
  const base = project(nominal);

  it('the tax refund goes on debt in its month', () => {
    // Without the refund, month 5 would owe 1,800 more (the refund is the only change).
    const withoutRefund = project({ ...nominal, windfalls: [] });
    expect(withoutRefund.points[5].debt - base.points[5].debt).toBeCloseTo(1_800, 6);
  });

  it('the car insurance fund pays its bill in month 6', () => {
    // 300 + 400 a month fills it to 1,200 by month 3 (priority first); month 6 pays the 1,200 bill.
    expect(base.points[5].goalBalances[0]).toBeCloseTo(1_200, 6);
    expect(base.points[6].goalBalances[0]).toBe(0);
    expect(base.warnings.shortBills).toEqual([false, false]);
  });

  it('the retirement number is 25 years of spending', () => {
    // 4,200 × 12 × 25 = 1,260,000.
    expect(SAMPLE_RETIREMENT.number).toBe(1_260_000);
  });
});
