import { describe, expect, it } from 'vitest';
import { debtRollovers, goalRollovers } from './rollover';
import { project, type ProjectionInput } from './projection';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

function plan(overrides: Partial<ProjectionInput>): ProjectionInput {
  return {
    months: 24,
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

describe('debt rollovers', () => {
  // Three debts at 0% so the arithmetic is plain. Budget 500, snowball (smallest balance first).
  //   A: 100, min 20     B: 400, min 50     C: 1,000, min 100
  // Month 1: minimums 170, extra 330. A needs 80 more -> cleared. 250 left goes to B: B pays 50 + 250 = 300 (100 left).
  //          C pays its 100 (900 left).
  // Month 2: minimums 50 + 100 = 150, extra 350. B needs 50 more -> cleared (pays 100). 300 left goes to C: pays 400 (500 left).
  // Month 3: C pays 100 + 400 = 500 -> cleared.
  const three = project(
    plan({
      debtMonthly: 500,
      debts: [
        { id: 'A', balance: 100, apr: 0, minPayment: 20 },
        { id: 'B', balance: 400, apr: 0, minPayment: 50 },
        { id: 'C', balance: 1_000, apr: 0, minPayment: 100 },
      ],
      accounts: [{ id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 }],
    }),
  );
  const minimums = [20, 50, 100];

  it('passes each paid-off debt on to the next one in the payoff order', () => {
    const [a, b] = debtRollovers(three, minimums, 'investments');
    // A is paid off in month 1, so there is no full month to read an amount from.
    expect(a).toEqual({ index: 0, month: 1, amount: null, target: { kind: 'items', indexes: [1] } });
    // B was paid 300 in month 1 and is paid off in month 2; that money moves to C.
    expect(b).toEqual({ index: 1, month: 2, amount: 300, target: { kind: 'items', indexes: [2] } });
  });

  it('sends the last debt to the chosen destination, with what it was being paid', () => {
    // C was paid 400 in month 2 and is paid off in month 3; nothing else is left.
    const last = debtRollovers(three, minimums, 'investments')[2];
    expect(last).toEqual({ index: 2, month: 3, amount: 400, target: { kind: 'destination', destination: 'investments' } });
    expect(debtRollovers(three, minimums, 'remaining')[2].target).toEqual({ kind: 'destination', destination: 'remaining' });
  });

  it('skips a minimum-only mortgage: the last card sends its money to the destination, not the mortgage', () => {
    // Mortgage 100,000 at 0%, 500 a month, minimum only. Card 1,000 at 0%, min 100.
    // Budget 700: minimums 600, so 100 extra goes to the card. It pays 200 a month and is gone in month 5.
    const result = project(
      plan({
        debtMonthly: 700,
        debts: [
          { id: 'M', balance: 100_000, apr: 0, minPayment: 500, minimumOnly: true },
          { id: 'C', balance: 1_000, apr: 0, minPayment: 100 },
        ],
      }),
    );
    const rollovers = debtRollovers(result, [500, 100], 'savings', [true, false]);
    expect(rollovers).toEqual([{ index: 1, month: 5, amount: 200, target: { kind: 'destination', destination: 'savings' } }]);
  });

  it('follows the strategy: avalanche passes money to the highest APR, not the smallest balance', () => {
    // Budget 300, avalanche (highest APR first).
    //   A: 100 at 0%, min 20.   B: 300 at 0%, min 50.   C: 5,000 at 12% (1% a month), min 100.
    // Every month: minimums 170, extra 130, and all of it goes to C: C pays 230, A pays 20, B pays 50.
    // A is cleared by its minimum alone after 5 months (5 × 20 = 100); B is cleared in month 6.
    // In month 5, C is paid 100 + 130 = 230 (130 above its minimum) and B only its 50, so C is the receiver.
    // Snowball would have chosen B (the smaller balance) here, and would have cleared A in month 1.
    const result = project(
      plan({
        debtMonthly: 300,
        debtStrategy: 'avalanche',
        debts: [
          { id: 'A', balance: 100, apr: 0, minPayment: 20 },
          { id: 'B', balance: 300, apr: 0, minPayment: 50 },
          { id: 'C', balance: 5_000, apr: 12, minPayment: 100 },
        ],
      }),
    );
    const a = debtRollovers(result, [20, 50, 100], 'investments').find((r) => r.index === 0);
    expect(a).toEqual({ index: 0, month: 5, amount: 20, target: { kind: 'items', indexes: [2] } });
  });

  it('says nothing for a debt that is never paid off, or one that is already gone', () => {
    // 1% of 10,000 is 100 a month in interest, so paying 100 never finishes it.
    const never = project(plan({ months: 36, debtMonthly: 100, debts: [{ id: 'X', balance: 10_000, apr: 12, minPayment: 100 }] }));
    expect(debtRollovers(never, [100], 'investments')).toEqual([]);

    const none = project(plan({ debtMonthly: 100, debts: [{ id: 'Y', balance: 0, apr: 12, minPayment: 25 }] }));
    expect(debtRollovers(none, [25], 'investments')).toEqual([]);
  });

  it('reads the receiver from the following month when the payoff month leaves nothing extra', () => {
    // Budget 70 against minimums 20 + 50, so nobody is paid above a minimum while both debts exist.
    //   A: 100, min 20 -> cleared by its minimum after 5 months.   B: 4,000, min 50.
    // In month 5 B is paid only 50 (no extra). From month 6 B gets the whole 70, 20 above its minimum,
    // which is A's money, so B is the receiver.
    const tight = project(
      plan({
        debtMonthly: 70,
        debts: [
          { id: 'A', balance: 100, apr: 0, minPayment: 20 },
          { id: 'B', balance: 4_000, apr: 0, minPayment: 50 },
        ],
      }),
    );
    expect(debtRollovers(tight, [20, 50], 'investments')).toEqual([
      { index: 0, month: 5, amount: 20, target: { kind: 'items', indexes: [1] } },
    ]);
  });

  it('says nothing when the budget is below the minimums, so no money moves anywhere', () => {
    // Budget 50 against minimums 20 + 50: each debt gets the same fraction of its minimum.
    // Months 1–6: 50 ÷ 70 of A's 20 = 14.2857 a month, leaving A with 100 − 85.714 = 14.2857.
    // Month 7: minimums are 14.2857 + 50 = 64.2857 (A's is capped by what it owes), so A pays 11.11 and owes 3.17.
    // Month 8: due 53.17, A pays 2.99 and owes 0.19.  Month 9: A pays the last 0.19: cleared in month 9.
    // From then on B is paid exactly its 50 minimum, nothing above it, so there is no receiver to name.
    const short = project(
      plan({
        debtMonthly: 50,
        debts: [
          { id: 'A', balance: 100, apr: 0, minPayment: 20 },
          { id: 'B', balance: 4_000, apr: 0, minPayment: 50 },
        ],
      }),
    );
    expect(short.debtPayoffMonths[0]).toBe(9);
    expect(debtRollovers(short, [20, 50], 'investments')).toEqual([]);
  });
});

describe('debt rollovers with one-time money', () => {
  it('reads the monthly amount from a month without one-time money', () => {
    // Visa 3,000 at 0%, min 100; Car 10,000 at 0%, min 200; 600 a month, snowball; 2,000 windfall to debt in month 2.
    // Month 1: Visa 100 + 300 extra = 400 (2,600 left). Month 2: Visa gets 400 + 2,000 = 2,400 (200 left).
    // Month 3: Visa is cleared. Month 2 holds the windfall, so the amount is read from month 1: 400 (not 2,400).
    const result = project(
      plan({
        months: 6,
        debtMonthly: 600,
        debts: [
          { id: 'visa', balance: 3_000, apr: 0, minPayment: 100 },
          { id: 'car', balance: 10_000, apr: 0, minPayment: 200 },
        ],
        windfalls: [{ id: 'w', month: 2, amount: 2_000, destination: 'debt' }],
      }),
    );
    const [visa] = debtRollovers(result, [100, 200], 'investments', [], [2]);
    expect(visa).toEqual({ index: 0, month: 3, amount: 400, target: { kind: 'items', indexes: [1] } });
  });
});

describe('goal rollovers', () => {
  it('priority mode: a full goal passes its money to the next goal down the list', () => {
    // Savings 500 a month. Emergency: target 1,000, has 400. Car: target 5,000, has 0.
    // Month 1: emergency gets 500 (900). Month 2: emergency needs 100, so 100 -> full; car gets 400.
    // Six months in, car has 400 + 4 × 500 = 2,400 of 5,000, so only the emergency fund has filled.
    const result = project(
      plan({
        months: 6,
        savingsMonthly: 500,
        goals: [
          { id: 'emergency', target: 1_000, balance: 400 },
          { id: 'car', target: 5_000, balance: 0 },
        ],
      }),
    );
    expect(goalRollovers(result, 'priority', 'investments')).toEqual([
      { index: 0, month: 2, amount: 500, target: { kind: 'items', indexes: [1] } },
    ]);
  });

  it('percent mode: a full goal is shared between every goal still open', () => {
    // Savings 400. A: target 300, 50%.  B: target 10,000, 25%.  C: target 10,000, 25%.
    // Month 1: A gets 200 (of 300), B 100, C 100.
    // Month 2: A needs 100 so takes 100 of its 200 share; the spare 100 is split between B and C: they get 100 + 50 each.
    //          A is full in month 2, having received 200 in month 1.
    const result = project(
      plan({
        savingsMonthly: 400,
        savingsSplitMode: 'percent',
        goals: [
          { id: 'A', target: 300, balance: 0, sharePercent: 50 },
          { id: 'B', target: 10_000, balance: 0, sharePercent: 25 },
          { id: 'C', target: 10_000, balance: 0, sharePercent: 25 },
        ],
      }),
    );
    expect(goalRollovers(result, 'percent', 'investments')).toEqual([
      { index: 0, month: 2, amount: 200, target: { kind: 'items', indexes: [1, 2] } },
    ]);
  });

  it('the last goal to fill sends its money to the chosen destination', () => {
    // One goal, target 600, savings 500 a month: 500 in month 1, then the last 100 in month 2.
    const result = project(plan({ savingsMonthly: 500, goals: [{ id: 'g', target: 600, balance: 0 }] }));
    expect(goalRollovers(result, 'priority', 'debt')).toEqual([
      { index: 0, month: 2, amount: 500, target: { kind: 'destination', destination: 'debt' } },
    ]);
  });

  it('reads the monthly amount from a month without one-time money', () => {
    // Goals 2,000 and 5,000; 200 a month; 800 windfall to savings in month 5.
    // Months 1–4: 200 each → 800. Month 5: 200 + 800 = 1,000 → 1,800. Month 6: 200 → 2,000, full.
    // Month 5 holds the windfall, so the monthly amount is read from month 4: 200 (not 1,000).
    const result = project(
      plan({
        months: 8,
        savingsMonthly: 200,
        goals: [
          { id: 'a', target: 2_000, balance: 0 },
          { id: 'b', target: 5_000, balance: 0 },
        ],
        windfalls: [{ id: 'w', month: 5, amount: 800, destination: 'savings' }],
      }),
    );
    expect(goalRollovers(result, 'priority', 'investments', [5])).toEqual([
      { index: 0, month: 6, amount: 200, target: { kind: 'items', indexes: [1] } },
    ]);
  });

  it('marks a sinking fund as moving its money only until the bill is due', () => {
    // Insurance 600 due in month 12, every 12 months; then a 5,000 goal. 200 a month: insurance full in month 3
    // (200, 400, 600), having received 200 in month 2.
    const result = project(
      plan({
        months: 6,
        savingsMonthly: 200,
        goals: [
          { id: 'ins', target: 600, balance: 0, repeat: { firstMonth: 12, everyMonths: 12 } },
          { id: 'car', target: 5_000, balance: 0 },
        ],
      }),
    );
    expect(goalRollovers(result, 'priority', 'investments', [], [true, false])).toEqual([
      { index: 0, month: 3, amount: 200, target: { kind: 'items', indexes: [1] }, untilDue: true },
    ]);
  });

  it('has no amount for a goal that fills next month', () => {
    const result = project(plan({ savingsMonthly: 500, goals: [{ id: 'g', target: 300, balance: 0 }] }));
    expect(goalRollovers(result, 'priority', 'investments')).toEqual([
      { index: 0, month: 1, amount: null, target: { kind: 'destination', destination: 'investments' } },
    ]);
  });

  it('says nothing for a goal that is already full, never fills, or fills from interest alone', () => {
    const full = project(plan({ savingsMonthly: 100, goals: [{ id: 'g', target: 500, balance: 500 }] }));
    expect(goalRollovers(full, 'priority', 'investments')).toEqual([]);

    const never = project(plan({ months: 12, savingsMonthly: 10, goals: [{ id: 'g', target: 100_000, balance: 0 }] }));
    expect(goalRollovers(never, 'priority', 'investments')).toEqual([]);

    // 1,000 at 1% a month reaches 1,020.10 by month 2 with no deposits at all.
    const interest = project(plan({ goals: [{ id: 'g', target: 1_020, balance: 1_000, apy: 12.682503013196972 }] }));
    expect(interest.goalFullMonths).toEqual([2]);
    expect(goalRollovers(interest, 'priority', 'investments')).toEqual([]);
  });
});
