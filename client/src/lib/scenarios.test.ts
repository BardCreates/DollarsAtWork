import { describe, expect, it } from 'vitest';
import { changesBetween, isEmptyChanges, resolveScenario, summarizeProjection, type ScenarioInputs } from './scenarios';
import { project, type ProjectionInput } from './projection';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

const base: ScenarioInputs = {
  monthlyIncome: 5_000,
  categoryAmounts: { rent: 1_500, dining: 300, debt: 700 },
  incomeGrowthRate: 0,
  debtStrategy: 'Snowball',
  debtDoneDestination: 'Investments',
  savingsDoneDestination: 'Investments',
};

describe('scenario changes', () => {
  it('keeps only what differs from the plan', () => {
    const edited: ScenarioInputs = {
      ...base,
      monthlyIncome: 5_500,
      categoryAmounts: { rent: 1_500, dining: 100, debt: 700 },
      incomeGrowthRate: 3,
      debtStrategy: 'Avalanche',
    };
    expect(changesBetween(base, edited)).toEqual({
      monthlyIncome: 5_500,
      categoryAmounts: { dining: 100 },
      incomeGrowthRate: 3,
      debtStrategy: 'Avalanche',
    });
  });

  it('is empty when nothing differs, even across rounding noise', () => {
    expect(changesBetween(base, base)).toEqual({});
    expect(isEmptyChanges(changesBetween(base, { ...base, monthlyIncome: 5_000.001 }))).toBe(true);
    expect(isEmptyChanges({ monthlyIncome: 5_100 })).toBe(false);
    expect(isEmptyChanges({ categoryAmounts: { dining: 50 } })).toBe(false);
  });

  it('lays changes over the plan, leaving everything else as the plan has it', () => {
    const resolved = resolveScenario(base, { monthlyIncome: 6_000, categoryAmounts: { dining: 100 }, debtDoneDestination: 'Savings' });
    expect(resolved).toEqual({
      monthlyIncome: 6_000,
      categoryAmounts: { rent: 1_500, dining: 100, debt: 700 },
      incomeGrowthRate: 0,
      debtStrategy: 'Snowball',
      debtDoneDestination: 'Savings',
      savingsDoneDestination: 'Investments',
    });
  });

  it('follows the plan when the plan changes underneath it', () => {
    // The scenario only cuts dining. If rent later goes up to 1,800 in the real plan, the scenario sees 1,800 too.
    const changes = { categoryAmounts: { dining: 100 } };
    const moved = { ...base, categoryAmounts: { ...base.categoryAmounts, rent: 1_800 } };
    expect(resolveScenario(moved, changes).categoryAmounts).toEqual({ rent: 1_800, dining: 100, debt: 700 });
  });

  it('ignores a change to a category that has since been deleted', () => {
    const resolved = resolveScenario(base, { categoryAmounts: { gone: 999, dining: 50 } });
    expect(resolved.categoryAmounts).toEqual({ rent: 1_500, dining: 50, debt: 700 });
  });

  it('resolving the changes between two plans gives back the edited plan', () => {
    const edited: ScenarioInputs = {
      monthlyIncome: 4_800,
      categoryAmounts: { rent: 1_400, dining: 0, debt: 900 },
      incomeGrowthRate: 2.5,
      debtStrategy: 'Custom',
      debtDoneDestination: 'Remaining',
      savingsDoneDestination: 'Debt',
    };
    expect(resolveScenario(base, changesBetween(base, edited))).toEqual(edited);
  });
});

describe('scenario metrics', () => {
  function plan(overrides: Partial<ProjectionInput>): ProjectionInput {
    return {
      months: 360,
      monthlyIncome: 5_000,
      savingsMonthly: 0,
      debtMonthly: 0,
      investmentsMonthly: 0,
      goals: [],
      debts: [],
      accounts: [{ id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 }],
      ...overrides,
    };
  }

  it('reports net worth at 10, 20 and 30 years', () => {
    // 100 a month into an account that doesn't grow: 12,000 after 10 years, 24,000 after 20, 36,000 after 30.
    const metrics = summarizeProjection(project(plan({ investmentsMonthly: 100 })));
    expect(metrics.netWorth).toEqual([
      { years: 10, value: 12_000 },
      { years: 20, value: 24_000 },
      { years: 30, value: 36_000 },
    ]);
    expect(metrics.hasDebt).toBe(false);
    expect(metrics.debtFreeMonth).toBe(0);
    expect(metrics.interestPaid).toBe(0);
  });

  it('reports the debt-free month and interest, and counts the freed money in net worth', () => {
    // $1,000 at 12% (1% a month), paying 100 a month: cleared in month 11, interest 58.98488 (worked out in the engine tests).
    // The whole 100 a month is the budget, so over 10 years 12,000 is paid in; 1,058.98488 of it clears the debt
    // and the rest, 10,941.01512, is invested. Each further 10 years adds 12,000.
    const metrics = summarizeProjection(project(plan({ debtMonthly: 100, debts: [{ id: 'card', balance: 1_000, apr: 12, minPayment: 25 }] })));
    expect(metrics.hasDebt).toBe(true);
    expect(metrics.debtFreeMonth).toBe(11);
    expect(metrics.interestPaid).toBeCloseTo(58.98488, 4);
    expect(metrics.netWorth[0].value).toBeCloseTo(10_941.01512, 4);
    expect(metrics.netWorth[1].value).toBeCloseTo(22_941.01512, 4);
    expect(metrics.netWorth[2].value).toBeCloseTo(34_941.01512, 4);
  });

  it('has no debt-free month when the debt is never paid off', () => {
    // 1% of 10,000 is 100 a month in interest, so paying 100 never finishes it.
    const metrics = summarizeProjection(project(plan({ debtMonthly: 100, debts: [{ id: 'x', balance: 10_000, apr: 12, minPayment: 100 }] })));
    expect(metrics.hasDebt).toBe(true);
    expect(metrics.debtFreeMonth).toBeNull();
  });

  it('reads the last month instead of failing when the projection is shorter than 30 years', () => {
    const metrics = summarizeProjection(project(plan({ months: 120, investmentsMonthly: 100 })));
    expect(metrics.netWorth.map((n) => n.value)).toEqual([12_000, 12_000, 12_000]);
  });
});
