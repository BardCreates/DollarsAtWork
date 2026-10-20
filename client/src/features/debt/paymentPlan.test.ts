import { describe, expect, it } from 'vitest';
import { project, type ProjectionInput } from '../../lib/projection';
import { paymentsForMonth } from './paymentPlan';

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
    accounts: [{ id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 }],
    ...overrides,
  };
}

describe('payments for a month', () => {
  // Three debts at 0% so the arithmetic is plain. Budget 500, snowball (smallest balance first).
  //   A: 100, min 20     B: 400, min 50     C: 1,000, min 100
  // Month 1: minimums 170, extra 330. A needs 80 more -> pays 100 and is cleared (last payment).
  //          250 extra left goes to B: 50 + 250 = 300 (100 left). C pays its 100 minimum.
  // Month 2: A owes nothing. B needs 100 -> last payment. C gets 500 - 100 = 400 (min 100 + 300 extra).
  const minimums = [20, 50, 100];
  const three = project(
    plan({
      debtMonthly: 500,
      debts: [
        { id: 'A', balance: 100, apr: 0, minPayment: 20 },
        { id: 'B', balance: 400, apr: 0, minPayment: 50 },
        { id: 'C', balance: 1_000, apr: 0, minPayment: 100 },
      ],
    }),
  );

  it('says which debt gets the extra and which get the minimum', () => {
    const [a, b, c] = paymentsForMonth(three, minimums, 1);
    expect(a).toMatchObject({ payment: 100, kind: 'last', extra: 0 });
    expect(b).toMatchObject({ payment: 300, kind: 'extra' });
    expect(b.extra).toBeCloseTo(250, 2);
    expect(c).toMatchObject({ payment: 100, kind: 'minimum', extra: 0 });
  });

  it('marks a debt already paid off as done', () => {
    const [a, b, c] = paymentsForMonth(three, minimums, 2);
    expect(a.kind).toBe('done');
    expect(b).toMatchObject({ payment: 100, kind: 'last' });
    expect(c.kind).toBe('extra');
    expect(c.payment).toBeCloseTo(400, 2);
    expect(c.extra).toBeCloseTo(300, 2);
  });

  it('flags a payment under the minimum when the budget is short', () => {
    // Budget 100 against minimums of 50 + 80 = 130 on balances that can't clear in one month.
    // Whatever the engine does with the shortfall, at least one debt is paid less than its minimum and not cleared.
    const short = project(
      plan({
        debtMonthly: 100,
        debts: [
          { id: 'X', balance: 1_000, apr: 0, minPayment: 50 },
          { id: 'Y', balance: 2_000, apr: 0, minPayment: 80 },
        ],
      }),
    );
    const lines = paymentsForMonth(short, [50, 80], 1);
    expect(lines.some((line) => line.kind === 'short')).toBe(true);
    // The two payments still add up to the 100 budget.
    expect(lines[0].payment + lines[1].payment).toBeCloseTo(100, 2);
  });

  it('returns nothing for a month outside the projection', () => {
    expect(paymentsForMonth(three, minimums, 0)).toEqual([]);
    expect(paymentsForMonth(three, minimums, 999)).toEqual([]);
  });
});
