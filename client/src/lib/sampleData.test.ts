import { describe, expect, it } from 'vitest';
import { comparePlans } from './planImpact';
import { project } from './projection';
import { SAMPLE_NAMES, sampleInput } from './sampleData';

describe('the demo plan', () => {
  const base = project(sampleInput());

  it("starts from the numbers the page describes", () => {
    // Savings 2,500 + 401(k) 18,000 − debts (4,200 + 13,500 = 17,700) = 2,800.
    expect(base.points[0].netWorth).toBe(2_800);
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
