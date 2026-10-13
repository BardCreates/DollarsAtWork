import { describe, expect, it } from 'vitest';
import { buildTimeline, isDone, isNear, nextUp, type TimelineItem } from './timeline';
import { project, type ProjectionInput } from './projection';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

function plan(overrides: Partial<ProjectionInput>): ProjectionInput {
  return {
    months: 60,
    monthlyIncome: 5000,
    savingsMonthly: 0,
    debtMonthly: 0,
    investmentsMonthly: 0,
    goals: [],
    debts: [],
    accounts: [],
    ...overrides,
  };
}

/** An account that doesn't grow, so net worth moves only by what is paid in. */
const cash = { id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 };

describe('building the roadmap', () => {
  // Three debts at 0%, budget 500, snowball (the same worked example as the rollover tests):
  //   A: 100, min 20 -> paid off month 1.   B: 400, min 50 -> month 2.   C: 1,000, min 100 -> month 3.
  // Month 3 uses the whole 500 on C, so nothing is freed yet. From month 4, 500 a month goes to the account:
  //   net worth at month t (t >= 3) = 500 × (t − 3).
  //   $10,000 is first reached when 500 × (t − 3) >= 10,000, so t = 23. $25,000: t = 53. $50,000: t = 103, beyond 60.
  const three = project(
    plan({
      debtMonthly: 500,
      debts: [
        { id: 'A', balance: 100, apr: 0, minPayment: 20 },
        { id: 'B', balance: 400, apr: 0, minPayment: 50 },
        { id: 'C', balance: 1_000, apr: 0, minPayment: 100 },
      ],
      accounts: [cash],
    }),
  );

  it('lists each debt payoff, then debt-free, then the net-worth steps that fall within the projection', () => {
    const items = buildTimeline(three, { debts: ['A', 'B', 'C'], goals: [] });
    expect(items.map((i) => [i.label, i.month])).toEqual([
      ['A paid off', 1],
      ['B paid off', 2],
      ['Debt-free', 3],
      ['$10,000 net worth', 23],
      ['$25,000 net worth', 53],
    ]);
  });

  it('does not list the last debt twice, and a single debt is just "Debt-free"', () => {
    const items = buildTimeline(three, { debts: ['A', 'B', 'C'], goals: [] });
    expect(items.filter((i) => i.label.includes('C paid off'))).toEqual([]);

    // One $1,000 loan at 12% paid $100 a month is cleared in month 11 (worked out in the engine tests).
    const one = project(plan({ months: 12, debtMonthly: 100, debts: [{ id: 'X', balance: 1_000, apr: 12, minPayment: 25 }] }));
    const labels = buildTimeline(one, { debts: ['Card'], goals: [] }).map((i) => i.label);
    expect(labels).toEqual(['Debt-free']);
  });

  it('lists goals with their month, including ones already full and ones that never fill', () => {
    // Savings 500 a month. Emergency: target 1,000, has 400 -> full in month 2 (400 + 500 + 100).
    // Car: target 5,000 has 0; six months in it has 400 + 4 × 500 = 2,400, so it is not full within 6 months.
    // Trip: target 300, has 300 -> already full.
    const result = project(
      plan({
        months: 6,
        savingsMonthly: 500,
        goals: [
          { id: 'emergency', target: 1_000, balance: 400 },
          { id: 'car', target: 5_000, balance: 0 },
          { id: 'trip', target: 300, balance: 300 },
        ],
      }),
    );
    const items = buildTimeline(result, { debts: [], goals: ['Emergency', 'Car', 'Trip'] });
    expect(items.map((i) => [i.label, i.month])).toEqual([
      ['Trip reached', 0],
      ['Emergency reached', 2],
      ['Car reached', null],
    ]);
  });

  it('skips net-worth steps already reached and leaves out ones that are out of reach', () => {
    // Starts with 30,000 and adds 1,000 a month, no growth: net worth at month t = 30,000 + 1,000 t.
    // $10,000 and $25,000 are already behind it. $50,000 at t = 20, $100,000 at t = 70,
    // $250,000 would need t = 220, beyond the 120 months projected, so it is left out.
    const result = project(
      plan({
        months: 120,
        investmentsMonthly: 1_000,
        accounts: [{ id: 'a', balance: 30_000, expectedReturn: 0, sharePercent: 100 }],
      }),
    );
    const items = buildTimeline(result, { debts: [], goals: [] });
    expect(items.map((i) => [i.label, i.month])).toEqual([
      ['$50,000 net worth', 20],
      ['$100,000 net worth', 70],
    ]);
  });

  it('puts only the next three net-worth steps on the roadmap', () => {
    // 1,000 a month from nothing, no growth, 600 months: $10k at 10, $25k at 25, $50k at 50, $100k at 100.
    const result = project(plan({ months: 600, investmentsMonthly: 1_000, accounts: [cash] }));
    const labels = buildTimeline(result, { debts: [], goals: [] }).map((i) => i.label);
    expect(labels).toEqual(['$10,000 net worth', '$25,000 net worth', '$50,000 net worth']);
  });

  it('has no debt milestones when there is no debt, and an empty roadmap when nothing is going anywhere', () => {
    const result = project(plan({ months: 12 }));
    expect(buildTimeline(result, { debts: [], goals: [] })).toEqual([]);
  });

  it('puts a debt that is never paid off last, as "Debt-free" with no date', () => {
    // 1% of 10,000 is 100 a month in interest, so paying 100 never finishes it.
    const result = project(plan({ months: 36, debtMonthly: 100, debts: [{ id: 'X', balance: 10_000, apr: 12, minPayment: 100 }] }));
    expect(buildTimeline(result, { debts: ['Loan'], goals: [] })).toEqual([{ key: 'debt-free', kind: 'debt-free', label: 'Debt-free', month: null }]);
  });
});

describe('what counts as near', () => {
  const item = (month: number | null): TimelineItem => ({ key: 'k', kind: 'goal', label: 'x', month });

  it('is within the next three months, and never for something already reached or never reached', () => {
    expect([0, 1, 3, 4, null].map((m) => isNear(item(m)))).toEqual([false, true, true, false, false]);
  });

  it('marks only month 0 as done', () => {
    expect([0, 1, null].map((m) => isDone(item(m)))).toEqual([true, false, false]);
  });

  it('finds the first milestone that is still ahead', () => {
    expect(nextUp([item(0), item(null), item(5), item(9)])?.month).toBe(5);
    expect(nextUp([item(0), item(null)])).toBeNull();
    expect(nextUp([])).toBeNull();
  });
});
