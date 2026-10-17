import { describe, expect, it } from 'vitest';
import { firstMonthNetWorthReaches, monthlyNeededForGoal, project } from './engine';
import type { ProjectionInput } from './types';

/**
 * Every expected number here was worked out by hand (the arithmetic is in the comments),
 * not copied from the engine's output.
 */

/** An empty plan; each test fills in only what it is about. */
function plan(overrides: Partial<ProjectionInput>): ProjectionInput {
  return {
    months: 12,
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

/** An account that neither grows nor is matched, so its balance is just the money put in. */
const cashAccount = { id: 'cash', balance: 0, expectedReturn: 0, sharePercent: 100 };

/** 12.682503% a year is exactly 1% a month (1.01^12 = 1.12682503). */
const ONE_PERCENT_A_MONTH = 12.682503013196972;

describe('rule 1: starts from current balances', () => {
  it('month 0 is today, and net worth = savings + investments + other assets − debts − other liabilities', () => {
    const result = project(
      plan({
        months: 0,
        goals: [{ id: 'g', target: 10_000, balance: 2_000 }],
        accounts: [{ id: 'a', balance: 15_000, sharePercent: 100 }],
        debts: [{ id: 'd', balance: 6_000, apr: 20, minPayment: 100 }],
        otherAssets: 250_000,
        otherLiabilities: 180_000,
      }),
    );

    expect(result.points).toHaveLength(1);
    const today = result.points[0];
    expect(today.month).toBe(0);
    expect(today.savings).toBe(2_000);
    expect(today.investments).toBe(15_000);
    expect(today.debt).toBe(6_000);
    // 2,000 + 15,000 + 250,000 − 6,000 − 180,000
    expect(today.netWorth).toBe(81_000);
  });

  it('returns one point per month up to the horizon', () => {
    const result = project(plan({ months: 480 }));
    expect(result.points).toHaveLength(481);
    expect(result.points[480].month).toBe(480);
  });
});

describe('rule 2: debts accrue interest and get minimums plus extra', () => {
  // $1,000 at 12% APR is 1% a month. Paying $100 a month:
  //   1: 1000.00 × 1.01 − 100 = 910.00
  //   2:  910.00 × 1.01 − 100 = 819.10
  //   3:  819.10 × 1.01 − 100 = 727.291
  //   ...
  //  10:  156.8325458 × 1.01 − 100 = 58.4008713
  //  11:   58.4008713 × 1.01 = 58.9848800, paid in full
  const oneLoan = plan({
    months: 12,
    debtMonthly: 100,
    debts: [{ id: 'card', balance: 1_000, apr: 12, minPayment: 25 }],
    accounts: [cashAccount],
  });

  it('follows a standard loan schedule month by month', () => {
    const { points } = project(oneLoan);
    expect(points[1].debt).toBeCloseTo(910, 6);
    expect(points[2].debt).toBeCloseTo(819.1, 6);
    expect(points[3].debt).toBeCloseTo(727.291, 6);
    expect(points[10].debt).toBeCloseTo(58.4008713, 6);
    expect(points[11].debt).toBe(0);

    expect(points[1].debtInterest[0]).toBeCloseTo(10, 6);
    expect(points[1].debtPayments[0]).toBeCloseTo(100, 6);
    expect(points[11].debtPayments[0]).toBeCloseTo(58.98488, 5);
  });

  it('reports the debt-free month and total interest', () => {
    const result = project(oneLoan);
    expect(result.debtFreeMonth).toBe(11);
    expect(result.debtPayoffMonths).toEqual([11]);
    // Paid 10 × 100 + 58.98488 on a 1,000 balance.
    expect(result.totalInterest).toBeCloseTo(58.98488, 5);
  });

  // Two debts, $300 a month:
  //   A: $500 at 10% APR, minimum $50      B: $2,000 at 24% APR, minimum $50
  // After interest in month 1: A = 500 × (1 + 0.10/12) = 504.1666667, B = 2000 × 1.02 = 2040.
  const twoDebts = plan({
    months: 60,
    debtMonthly: 300,
    debts: [
      { id: 'A', balance: 500, apr: 10, minPayment: 50 },
      { id: 'B', balance: 2_000, apr: 24, minPayment: 50 },
    ],
  });

  it('snowball sends the extra to the smallest balance, then rolls it to the next debt', () => {
    const { points, debtPayoffMonths } = project({ ...twoDebts, debtStrategy: 'snowball' });

    // Month 1: A gets its 50 minimum + 200 extra, B gets 50.
    expect(points[1].debtBalances[0]).toBeCloseTo(254.1666667, 6); // 504.1666667 − 250
    expect(points[1].debtBalances[1]).toBeCloseTo(1_990, 6); // 2040 − 50

    // Month 2: A = 254.1666667 × 1.0083333 − 250 = 6.2847222; B = 1990 × 1.02 − 50 = 1979.80
    expect(points[2].debtBalances[0]).toBeCloseTo(6.2847222, 6);
    expect(points[2].debtBalances[1]).toBeCloseTo(1_979.8, 6);

    // Month 3: A owes 6.2847222 × 1.0083333 = 6.3370949 and is cleared.
    // B = 1979.80 × 1.02 = 2019.396, and gets everything else: 300 − 6.3370949 = 293.6629051.
    expect(points[3].debtBalances[0]).toBe(0);
    expect(points[3].debtBalances[1]).toBeCloseTo(1_725.7330949, 6);
    expect(points[3].debtPayments[0] + points[3].debtPayments[1]).toBeCloseTo(300, 6);
    expect(debtPayoffMonths[0]).toBe(3);
  });

  it('avalanche sends the extra to the highest APR', () => {
    const { points } = project({ ...twoDebts, debtStrategy: 'avalanche' });
    expect(points[1].debtBalances[0]).toBeCloseTo(454.1666667, 6); // 504.1666667 − 50
    expect(points[1].debtBalances[1]).toBeCloseTo(1_790, 6); // 2040 − 250
  });

  it('custom follows the order of the list', () => {
    const reversed = { ...twoDebts, debts: [twoDebts.debts[1], twoDebts.debts[0]] };
    const { points } = project({ ...reversed, debtStrategy: 'custom' });
    expect(points[1].debtBalances).toEqual([expect.closeTo(1_790, 6), expect.closeTo(454.1666667, 6)]);
  });

  it('avalanche never costs more interest than snowball', () => {
    const snowball = project({ ...twoDebts, debtStrategy: 'snowball' });
    const avalanche = project({ ...twoDebts, debtStrategy: 'avalanche' });
    expect(avalanche.totalInterest).toBeLessThan(snowball.totalInterest);
    expect(avalanche.debtFreeMonth).not.toBeNull();
    expect(snowball.debtFreeMonth).not.toBeNull();
  });

  it('minimums only pays just each minimum and ignores the budget', () => {
    const { points, debtFreeMonth } = project({ ...oneLoan, minimumsOnly: true });
    expect(points[1].debt).toBeCloseTo(985, 6); // 1010 − 25
    expect(points[2].debt).toBeCloseTo(969.85, 6); // 985 × 1.01 − 25
    expect(debtFreeMonth).toBeNull(); // nowhere near done in a year
    expect(points[12].investments).toBe(0); // the unused budget isn't invested
  });

  it('warns when the budget is below the minimums and shares the shortfall evenly', () => {
    const result = project(
      plan({
        months: 1,
        debtMonthly: 60,
        debts: [
          { id: 'A', balance: 1_000, apr: 0, minPayment: 40 },
          { id: 'B', balance: 1_000, apr: 0, minPayment: 80 },
        ],
      }),
    );
    expect(result.warnings.debtBudgetBelowMinimums).toBe(true);
    // 60 covers half of the 120 due, so each debt gets half its minimum.
    expect(result.points[1].debtPayments).toEqual([expect.closeTo(20, 6), expect.closeTo(40, 6)]);
    expect(result.debtFreeMonth).toBeNull();
  });

  it('does not warn when the budget covers the minimums', () => {
    expect(project(oneLoan).warnings.debtBudgetBelowMinimums).toBe(false);
  });

  it('warns when a payment is less than the interest, so the balance grows', () => {
    // 10,000 at 24% APR charges 10,000 × 0.24 / 12 = 200 a month. Paying 150 leaves it at 10,050 after month 1.
    const result = project(plan({ months: 2, debtMonthly: 150, debts: [{ id: 'card', balance: 10_000, apr: 24, minPayment: 150 }] }));
    expect(result.warnings.debtGrowing).toBe(true);
    expect(result.points[1].debt).toBeCloseTo(10_050, 6);
  });

  it('does not warn when payments cover the interest', () => {
    // Same card, 250 a month: 50 more than the 200 interest, so it shrinks.
    const result = project(plan({ months: 2, debtMonthly: 250, debts: [{ id: 'card', balance: 10_000, apr: 24, minPayment: 150 }] }));
    expect(result.warnings.debtGrowing).toBe(false);
  });
});

describe('rule 2: goals get their share and earn APY', () => {
  it('earns interest on what was already there, then adds the deposit', () => {
    const { points } = project(
      plan({
        months: 2,
        savingsMonthly: 100,
        goals: [{ id: 'g', target: 1_000_000, balance: 1_000, apy: ONE_PERCENT_A_MONTH }],
      }),
    );
    expect(points[1].savings).toBeCloseTo(1_110, 6); // 1000 × 1.01 + 100
    expect(points[2].savings).toBeCloseTo(1_221.1, 6); // 1110 × 1.01 + 100
  });

  it('an APY compounds to exactly that much over a year', () => {
    const { points } = project(plan({ months: 12, goals: [{ id: 'g', target: 1_000_000, balance: 10_000, apy: 4.5 }] }));
    expect(points[12].savings).toBeCloseTo(10_450, 6);
  });

  it('priority mode fills goals top to bottom, and a finished goal passes its money on', () => {
    const result = project(
      plan({
        months: 3,
        savingsMonthly: 500,
        goals: [
          { id: 'emergency', target: 1_000, balance: 400 },
          { id: 'car', target: 5_000, balance: 0 },
        ],
      }),
    );
    expect(result.points[1].goalBalances).toEqual([900, 0]);
    expect(result.points[2].goalBalances).toEqual([1_000, 400]); // 100 finishes the first, 400 moves on
    expect(result.points[3].goalBalances).toEqual([1_000, 900]);
    expect(result.goalFullMonths).toEqual([2, null]);
  });

  it('percent mode splits by share, and what a goal no longer needs goes to the others', () => {
    const { points } = project(
      plan({
        months: 3,
        savingsMonthly: 400,
        savingsSplitMode: 'percent',
        goals: [
          { id: 'trip', target: 500, balance: 0, sharePercent: 75 },
          { id: 'house', target: 10_000, balance: 0, sharePercent: 25 },
        ],
      }),
    );
    expect(points[1].goalBalances).toEqual([300, 100]);
    // Trip needs only 200 of its 300; the spare 100 joins the house's own 100.
    expect(points[2].goalBalances[0]).toBeCloseTo(500, 6);
    expect(points[2].goalBalances[1]).toBeCloseTo(300, 6);
    expect(points[3].goalBalances[1]).toBeCloseTo(700, 6); // the whole 400
  });

  it('a goal that is already full is reported as full today', () => {
    const result = project(plan({ months: 1, goals: [{ id: 'done', target: 500, balance: 500 }] }));
    expect(result.goalFullMonths).toEqual([0]);
  });
});

describe('rule 2: investments get contributions and match, and grow monthly', () => {
  it('an expected return compounds to exactly that much over a year', () => {
    const { points } = project(plan({ months: 24, accounts: [{ id: 'a', balance: 10_000, expectedReturn: 7, sharePercent: 100 }] }));
    expect(points[12].investments).toBeCloseTo(10_700, 6);
    expect(points[24].investments).toBeCloseTo(11_449, 6); // 10,000 × 1.07²
  });

  it('grows what was there, then adds the contribution, and tracks contributed vs growth', () => {
    const { points } = project(
      plan({
        months: 3,
        investmentsMonthly: 100,
        accounts: [{ id: 'a', balance: 0, expectedReturn: ONE_PERCENT_A_MONTH, sharePercent: 100 }],
      }),
    );
    expect(points[1].investments).toBeCloseTo(100, 6);
    expect(points[2].investments).toBeCloseTo(201, 6); // 100 × 1.01 + 100
    expect(points[3].investments).toBeCloseTo(303.01, 6); // 201 × 1.01 + 100
    expect(points[3].investedToDate).toBeCloseTo(300, 6);
    expect(points[3].investmentGrowthToDate).toBeCloseTo(3.01, 6);
  });

  it('splits the monthly amount across accounts by share', () => {
    const { points } = project(
      plan({
        months: 2,
        investmentsMonthly: 500,
        accounts: [
          { id: '401k', balance: 0, expectedReturn: 0, sharePercent: 60 },
          { id: 'ira', balance: 0, expectedReturn: 0, sharePercent: 40 },
        ],
      }),
    );
    expect(points[2].accountBalances).toEqual([600, 400]);
  });

  it('employer match is a percent of the contribution, up to a percent of income', () => {
    const matched = { id: '401k', balance: 0, expectedReturn: 0, sharePercent: 100, matchPercent: 50, matchLimitPercent: 6 };

    // Income 5,000: the cap is 6% = 300. Contributing 400 earns 50% of 300 = 150.
    const overCap = project(plan({ months: 1, investmentsMonthly: 400, accounts: [matched] }));
    expect(overCap.points[1].investments).toBeCloseTo(550, 6);
    expect(overCap.points[1].matchedToDate).toBeCloseTo(150, 6);

    // Contributing 200 is under the cap and earns 50% of 200 = 100.
    const underCap = project(plan({ months: 1, investmentsMonthly: 200, accounts: [matched] }));
    expect(underCap.points[1].investments).toBeCloseTo(300, 6);
  });

  it('holds invested money at the default 7% return, with a warning, when there are no accounts', () => {
    const result = project(plan({ months: 13, investmentsMonthly: 100 }));
    expect(result.warnings.investingWithoutAccounts).toBe(true);
    expect(result.points[1].unassignedInvestments).toBeCloseTo(100, 6);
    // The first 100 has had exactly 12 months of growth by month 13: 107. Later deposits make it more.
    expect(result.points[13].investments).toBeGreaterThan(1_300 + 7);
  });
});

describe('rule 3: money from paid-off debt keeps working', () => {
  // Same loan as above: cleared in month 11 with a final payment of 58.98488 out of the 100 budget.
  const loan = plan({
    months: 13,
    debtMonthly: 100,
    debts: [{ id: 'card', balance: 1_000, apr: 12, minPayment: 25 }],
    accounts: [cashAccount],
    goals: [{ id: 'g', target: 1_000_000, balance: 0 }],
  });

  it('moves the debt budget to investments by default once all debt is gone', () => {
    const { points } = project(loan);
    expect(points[10].investments).toBe(0);
    expect(points[11].investments).toBeCloseTo(41.01512, 5); // 100 − 58.98488
    expect(points[12].investments).toBeCloseTo(141.01512, 5);
    expect(points[13].investments).toBeCloseTo(241.01512, 5);
  });

  it('can move it to savings instead', () => {
    const { points } = project({ ...loan, debtDoneDestination: 'savings' });
    expect(points[12].savings).toBeCloseTo(141.01512, 5);
    expect(points[12].investments).toBe(0);
  });

  it('can hand it back to Remaining, where it is no longer projected', () => {
    const { points } = project({ ...loan, debtDoneDestination: 'remaining' });
    expect(points[13].savings).toBe(0);
    expect(points[13].investments).toBe(0);
  });

  it('treats a plan with no debts as debt-free today and moves the debt budget straight away', () => {
    const result = project(plan({ months: 2, debtMonthly: 250, accounts: [cashAccount] }));
    expect(result.debtFreeMonth).toBe(0);
    expect(result.points[2].investments).toBe(500);
  });
});

describe('rule 4: money from full goals keeps working', () => {
  const oneGoal = plan({
    months: 3,
    savingsMonthly: 500,
    goals: [{ id: 'g', target: 600, balance: 0 }],
    accounts: [cashAccount],
  });

  it('moves the savings amount to investments by default once every goal is full', () => {
    const { points } = project(oneGoal);
    expect(points[1].savings).toBe(500);
    expect(points[2].savings).toBe(600);
    expect(points[2].investments).toBe(400); // the 400 the goal didn't need
    expect(points[3].investments).toBe(900);
  });

  it('can move it to debt instead, as extra on top of the debt budget', () => {
    const { points } = project({
      ...oneGoal,
      savingsDoneDestination: 'debt',
      debtMonthly: 100,
      debts: [{ id: 'd', balance: 5_000, apr: 0, minPayment: 100 }],
    });
    expect(points[1].debt).toBe(4_900); // 100
    expect(points[2].debt).toBe(4_400); // 100 + the spare 400
    expect(points[3].debt).toBe(3_800); // 100 + 500
    expect(points[3].investments).toBe(0);
  });

  it('invests it when it is sent to debt but there is no debt left', () => {
    const { points } = project({ ...oneGoal, savingsDoneDestination: 'debt' });
    expect(points[3].investments).toBe(900);
  });
});

describe("rule 5: today's dollars", () => {
  it('an account growing at exactly the inflation rate keeps the same buying power', () => {
    const input = plan({ months: 24, accounts: [{ id: 'a', balance: 10_000, expectedReturn: 3, sharePercent: 100 }] });

    const actual = project(input);
    expect(actual.points[12].netWorth).toBeCloseTo(10_300, 6);

    const adjusted = project({ ...input, todaysDollars: true });
    expect(adjusted.points[12].netWorth).toBeCloseTo(10_000, 6);
    expect(adjusted.points[24].netWorth).toBeCloseTo(10_000, 6);
  });

  it('uses a custom inflation rate, and cash loses buying power', () => {
    const { points } = project(
      plan({ months: 12, todaysDollars: true, inflationRate: 5, accounts: [{ id: 'a', balance: 10_500, expectedReturn: 0, sharePercent: 100 }] }),
    );
    expect(points[12].investments).toBeCloseTo(10_000, 6); // 10,500 ÷ 1.05
  });
});

describe('rule 5: yearly income raise', () => {
  const raise = plan({ months: 25, monthlyIncome: 5_000, remaining: 200, incomeGrowthRate: 4 });

  it('pays a full first year at today\'s income, then raises it from month 13 and adds the extra to Remaining', () => {
    const { points } = project(raise);
    // Months 1–12 are year one: all twelve at 5,000.
    expect(points[12].income).toBe(5_000);
    expect(points[12].remaining).toBe(200);
    expect(points[13].income).toBeCloseTo(5_200, 6); // 5,000 × 1.04
    expect(points[13].remaining).toBeCloseTo(400, 6); // 200 + the 200 raise
    expect(points[24].income).toBeCloseTo(5_200, 6); // still year two
    expect(points[25].income).toBeCloseTo(5_408, 6); // 5,000 × 1.04²
  });

  it('with no raise, income and Remaining stay put', () => {
    const { points } = project({ ...raise, incomeGrowthRate: 0 });
    expect(points[25].income).toBe(5_000);
    expect(points[25].remaining).toBe(200);
  });

  it('a higher income lifts the employer-match cap', () => {
    // Cap is 6% of income: 300 in year one, 312 after the 4% raise. Match is 50% of the capped amount.
    const { points } = project({
      ...raise,
      months: 13,
      investmentsMonthly: 400,
      accounts: [{ id: '401k', balance: 0, expectedReturn: 0, sharePercent: 100, matchPercent: 50, matchLimitPercent: 6 }],
    });
    // Year one: 12 months × 150. Month 13, after the raise: 156.
    expect(points[12].matchedToDate).toBeCloseTo(12 * 150, 6);
    expect(points[13].matchedToDate).toBeCloseTo(12 * 150 + 156, 6);
  });
});

describe('what a goal gets and needs each month', () => {
  it('reports what each goal received each month', () => {
    const { points } = project(
      plan({
        months: 2,
        savingsMonthly: 500,
        goals: [
          { id: 'emergency', target: 1_000, balance: 400 },
          { id: 'car', target: 5_000, balance: 0 },
        ],
      }),
    );
    expect(points[0].goalDeposits).toEqual([0, 0]);
    expect(points[1].goalDeposits).toEqual([500, 0]);
    expect(points[2].goalDeposits).toEqual([100, 400]);
  });

  it('with no interest, the gap is split evenly over the months', () => {
    expect(monthlyNeededForGoal({ target: 1_200, balance: 0 }, 12)).toBeCloseTo(100, 6);
    expect(monthlyNeededForGoal({ target: 1_200, balance: 600 }, 4)).toBeCloseTo(150, 6);
  });

  it('interest lowers what is needed', () => {
    // From the savings test above: 1,000 at 1% a month plus 100 a month is 1,221.10 after 2 months.
    expect(monthlyNeededForGoal({ target: 1_221.1, balance: 1_000, apy: ONE_PERCENT_A_MONTH }, 2)).toBeCloseTo(100, 6);
  });

  it('needs nothing when the goal is full or interest alone gets there, and cannot be done with no time left', () => {
    expect(monthlyNeededForGoal({ target: 500, balance: 500 }, 6)).toBe(0);
    expect(monthlyNeededForGoal({ target: 1_010, balance: 1_000, apy: ONE_PERCENT_A_MONTH }, 1)).toBe(0);
    expect(monthlyNeededForGoal({ target: 500, balance: 100 }, 0)).toBe(Infinity);
  });
});

describe('rule 6: other items move by their own yearly change', () => {
  it('grows a home by its yearly change, compounding monthly', () => {
    const { points } = project(plan({ months: 12, otherItems: [{ id: 'home', value: 200_000, kind: 'asset', yearlyChange: ONE_PERCENT_A_MONTH }] }));
    expect(points[0].otherAssets).toBe(200_000);
    expect(points[1].otherAssets).toBeCloseTo(202_000, 5); // 200,000 × 1.01
    expect(points[12].otherAssets).toBeCloseTo(225_365.006, 3); // 200,000 × 1.01^12 = 200,000 × 1.12682503
    expect(points[12].netWorth).toBeCloseTo(225_365.006, 3);
    expect(points[12].otherItemValues[0]).toBeCloseTo(225_365.006, 3);
  });

  it('shrinks a car by a negative yearly change', () => {
    // 0.99^12 = 0.8863848717, so losing 11.36151283% a year is exactly 1% a month.
    const { points } = project(plan({ months: 12, otherItems: [{ id: 'car', value: 10_000, kind: 'asset', yearlyChange: -11.36151283 }] }));
    expect(points[1].otherAssets).toBeCloseTo(9_900, 5);
    expect(points[12].otherAssets).toBeCloseTo(8_863.848717, 4);
  });

  it('keeps an item with no yearly change flat, subtracts liabilities, and adds the flat totals on top', () => {
    const { points } = project(
      plan({
        months: 12,
        otherItems: [
          { id: 'home', value: 200_000, kind: 'asset' },
          { id: 'family-loan', value: 5_000, kind: 'liability' },
        ],
        otherAssets: 1_000,
        otherLiabilities: 300,
      }),
    );
    expect(points[12].otherAssets).toBe(201_000);
    expect(points[12].otherLiabilities).toBe(5_300);
    expect(points[12].netWorth).toBe(195_700);
  });

  it("restates item values in today's dollars with everything else", () => {
    const { points } = project(plan({ months: 12, otherItems: [{ id: 'home', value: 100_000, kind: 'asset' }], todaysDollars: true, inflationRate: ONE_PERCENT_A_MONTH }));
    expect(points[12].otherAssets).toBeCloseTo(88_744.9225, 3); // 100,000 / 1.12682503
    expect(points[12].otherItemValues[0]).toBeCloseTo(88_744.9225, 3);
  });
});

describe('rule 7: a minimum-only debt (a mortgage) stays out of the payoff order', () => {
  // The card gets its $100 minimum plus the $100 left after the mortgage's $500: $200 a month, gone in month 5.
  const mortgagePlan = plan({
    months: 8,
    debtMonthly: 700,
    debts: [
      { id: 'mortgage', balance: 100_000, apr: 0, minPayment: 500, minimumOnly: true },
      { id: 'card', balance: 1_000, apr: 0, minPayment: 100 },
    ],
    accounts: [cashAccount],
  });

  it('pays only the minimum on it, even when there is extra to give', () => {
    const { points } = project(mortgagePlan);
    expect(points[1].debtPayments).toEqual([500, 200]);
    expect(points[1].debtBalances).toEqual([99_500, 800]);
    expect(points[6].debtBalances[0]).toBe(97_000); // 100,000 − 6 × 500
  });

  it('reaches debt-free when the other debts are gone, and the mortgage stays open', () => {
    const result = project(mortgagePlan);
    expect(result.debtPayoffMonths).toEqual([null, 5]);
    expect(result.debtFreeMonth).toBe(5);
  });

  it('sends the extra to the debt destination once only the mortgage is left', () => {
    const { points } = project(mortgagePlan);
    expect(points[5].investments).toBe(0); // month 5: 500 + 100 minimum + 100 extra clears the card, nothing left
    expect(points[6].investments).toBe(200); // 700 − 500
    expect(points[7].investments).toBe(400);
  });

  it('is debt-free today when the mortgage is the only debt, and frees the extra straight away', () => {
    const result = project(plan({ months: 2, debtMonthly: 700, debts: [{ id: 'mortgage', balance: 100_000, apr: 0, minPayment: 500, minimumOnly: true }], accounts: [cashAccount] }));
    expect(result.debtFreeMonth).toBe(0);
    expect(result.points[1].investments).toBe(200);
    expect(result.points[2].debtBalances[0]).toBe(99_000);
  });
});

describe('milestones', () => {
  it('finds the first month net worth reaches an amount', () => {
    const result = project(plan({ months: 12, investmentsMonthly: 1_000, accounts: [cashAccount] }));
    expect(firstMonthNetWorthReaches(result, 5_000)).toBe(5);
    expect(firstMonthNetWorthReaches(result, 0)).toBe(0);
    expect(firstMonthNetWorthReaches(result, 1_000_000)).toBeNull();
  });
});

describe('the engine is pure', () => {
  it('does not change its input and gives the same answer every time', () => {
    const input = plan({
      months: 36,
      savingsMonthly: 300,
      debtMonthly: 400,
      investmentsMonthly: 500,
      goals: [{ id: 'g', target: 5_000, balance: 100, apy: 4 }],
      debts: [{ id: 'd', balance: 8_000, apr: 19.99, minPayment: 160 }],
      accounts: [{ id: 'a', balance: 2_000, sharePercent: 100 }],
    });
    const before = JSON.stringify(input);

    const first = project(input);
    const second = project(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(second).toEqual(first);
  });
});

describe('rule 8: which debts are growing', () => {
  it('names each debt whose payment missed its interest, in input order', () => {
    // Card: 10,000 at 30% charges 10,000 × 0.30 / 12 = 250 a month; its 100 minimum misses that, so it grows.
    // Loan: 1,000 at 12% charges 10; its 50 minimum covers it. The budget is exactly the minimums (150).
    const result = project(
      plan({
        months: 2,
        debtMonthly: 150,
        debts: [
          { id: 'card', balance: 10_000, apr: 30, minPayment: 100 },
          { id: 'loan', balance: 1_000, apr: 12, minPayment: 50 },
        ],
      }),
    );
    expect(result.warnings.debtGrowing).toBe(true);
    expect(result.warnings.growingDebts).toEqual([true, false]);
    // 10,000 + 250 − 100 = 10,150 after month 1.
    expect(result.points[1].debtBalances[0]).toBeCloseTo(10_150, 6);
  });
});

describe('rule 9: paycheck contributions and a match on salary before taxes', () => {
  it('adds what comes straight from the paycheck on top of the plan amount, and counts it as invested', () => {
    // Plan amount 100 + paycheck 400 = 500 a month into a 0% account.
    const { points } = project(plan({ months: 2, investmentsMonthly: 100, accounts: [{ ...cashAccount, payrollMonthly: 400 }] }));
    expect(points[1].investments).toBeCloseTo(500, 6);
    expect(points[2].investments).toBeCloseTo(1_000, 6);
    expect(points[2].investedToDate).toBeCloseTo(1_000, 6);
  });

  it('paycheck money goes in even when the plan invests nothing', () => {
    const { points } = project(plan({ months: 1, accounts: [{ ...cashAccount, payrollMonthly: 250 }] }));
    expect(points[1].investments).toBeCloseTo(250, 6);
  });

  it('caps the match at a percent of salary before taxes, not take-home pay', () => {
    // Take-home 5,000, salary 90,000 a year = 7,500 a month. Match 50% up to 6%: the cap is 6% × 7,500 = 450.
    // Paycheck 600 → matchable 450 → match 225. Total 600 + 225 = 825.
    const account = { ...cashAccount, payrollMonthly: 600, matchPercent: 50, matchLimitPercent: 6, matchSalaryMonthly: 7_500 };
    const withSalary = project(plan({ months: 1, accounts: [account] }));
    expect(withSalary.points[1].investments).toBeCloseTo(825, 6);
    expect(withSalary.points[1].matchedToDate).toBeCloseTo(225, 6);

    // Without the salary the cap falls back to take-home: 6% × 5,000 = 300 → match 150. Total 750.
    const noSalary = { ...account, matchSalaryMonthly: undefined };
    expect(project(plan({ months: 1, accounts: [noSalary] })).points[1].investments).toBeCloseTo(750, 6);
  });

  it('the salary the match is capped on, and the paycheck money, grow with the raise', () => {
    // Salary 5,000 a month, 10% raise from month 13: 5,500. Match 100% up to 10%: cap 500 in year one, 550 in year two.
    // Paycheck 1,000 a month, 1,100 from month 13: month 1 adds 1,000 + 500, month 13 adds 1,100 + 550 = 1,650.
    const account = { ...cashAccount, payrollMonthly: 1_000, matchPercent: 100, matchLimitPercent: 10, matchSalaryMonthly: 5_000 };
    const { points } = project(plan({ months: 13, incomeGrowthRate: 10, accounts: [account] }));
    expect(points[1].investments).toBeCloseTo(1_500, 6);
    expect(points[13].investments - points[12].investments).toBeCloseTo(1_650, 6);
  });
});

describe('rule 10: a raise can go to investments', () => {
  it('adds each raise to the month’s investing instead of Remaining', () => {
    // Income 5,000, 10% raise: year two is 5,500, so 500 more a month is invested from month 13.
    // Months 1–12 invest 100 each = 1,200; month 13 invests 100 + 500 = 600 → 1,800.
    const input = plan({ months: 13, investmentsMonthly: 100, incomeGrowthRate: 10, raiseDestination: 'investments', accounts: [cashAccount] });
    const { points } = project(input);
    expect(points[12].investments).toBeCloseTo(1_200, 6);
    expect(points[13].investments).toBeCloseTo(1_800, 6);
    // And Remaining doesn't also count it.
    expect(points[13].remaining).toBeCloseTo(0, 6);
  });

  it('by default the raise still lands in Remaining and is not invested', () => {
    const { points } = project(plan({ months: 13, investmentsMonthly: 100, incomeGrowthRate: 10, accounts: [cashAccount] }));
    expect(points[13].investments).toBeCloseTo(1_300, 6);
    expect(points[13].remaining).toBeCloseTo(500, 6);
  });
});

describe('rule 11: a lower or higher return for the range', () => {
  it('moves every account’s expected return by the adjustment', () => {
    // 7% − 2 = 5%: 10,000 → 10,500 after a year. 7% + 2 = 9%: 10,900.
    const account = { id: 'a', balance: 10_000, expectedReturn: 7, sharePercent: 100 };
    expect(project(plan({ months: 12, accounts: [account], returnAdjustment: -2 })).points[12].investments).toBeCloseTo(10_500, 6);
    expect(project(plan({ months: 12, accounts: [account], returnAdjustment: 2 })).points[12].investments).toBeCloseTo(10_900, 6);
  });

  it('moves the default return for money with no account too', () => {
    // 1,000 a month with no account at the default 7% − 7 = 0%: exactly 2,000 after two months.
    const { points } = project(plan({ months: 2, investmentsMonthly: 1_000, returnAdjustment: -7 }));
    expect(points[2].investments).toBeCloseTo(2_000, 6);
  });
});

describe('rule 12: one-time money (windfalls)', () => {
  it('a debt windfall is an extra payment that month', () => {
    // 1,000 at 12% (1% a month), 100 a month, plus 500 in month 1: 1,000 × 1.01 − 100 − 500 = 410.
    const { points } = project(
      plan({
        months: 2,
        debtMonthly: 100,
        debts: [{ id: 'card', balance: 1_000, apr: 12, minPayment: 25 }],
        accounts: [cashAccount],
        windfalls: [{ id: 'refund', month: 1, amount: 500, destination: 'debt' }],
      }),
    );
    expect(points[1].debt).toBeCloseTo(410, 6);
    // Month 2 is back to 100: 410 × 1.01 − 100 = 314.1.
    expect(points[2].debt).toBeCloseTo(314.1, 6);
  });

  it('what a debt windfall doesn’t need moves on like a paid-off debt’s money', () => {
    // 300 owed at 0%, 50 a month, 1,000 in month 1: 300 is paid, 750 is left (1,050 − 300) and goes to Investments.
    const { points, debtFreeMonth } = project(
      plan({
        months: 1,
        debtMonthly: 50,
        debts: [{ id: 'loan', balance: 300, apr: 0, minPayment: 50 }],
        accounts: [cashAccount],
        windfalls: [{ id: 'bonus', month: 1, amount: 1_000, destination: 'debt' }],
      }),
    );
    expect(debtFreeMonth).toBe(1);
    expect(points[1].investments).toBeCloseTo(750, 6);
  });

  it('a savings windfall fills goals, and what they can’t take is finished money', () => {
    // Goal 1,000; 100 a month. Month 1: 100. Month 2: 100 + 2,000 → fills to 1,000, 1,200 left → Investments.
    const { points, goalFullMonths } = project(
      plan({
        months: 2,
        savingsMonthly: 100,
        goals: [{ id: 'fund', target: 1_000, balance: 0 }],
        accounts: [cashAccount],
        windfalls: [{ id: 'gift', month: 2, amount: 2_000, destination: 'savings' }],
      }),
    );
    expect(points[1].savings).toBeCloseTo(100, 6);
    expect(points[2].savings).toBeCloseTo(1_000, 6);
    expect(goalFullMonths[0]).toBe(2);
    expect(points[2].investments).toBeCloseTo(1_200, 6);
  });

  it('an investment windfall is invested that month only, and two in one month add up', () => {
    const { points } = project(
      plan({
        months: 4,
        accounts: [cashAccount],
        windfalls: [
          { id: 'a', month: 3, amount: 1_000, destination: 'investments' },
          { id: 'b', month: 3, amount: 250, destination: 'investments' },
        ],
      }),
    );
    expect(points[2].investments).toBe(0);
    expect(points[3].investments).toBeCloseTo(1_250, 6);
    expect(points[4].investments).toBeCloseTo(1_250, 6);
    expect(points[3].investedToDate).toBeCloseTo(1_250, 6);
  });

  it('is never dropped: with no debt left and "remaining" chosen, a debt windfall is invested', () => {
    // No debts, debt money done = remaining. 50 a month to debt is left over and dropped (it's monthly spending
    // money), but the 1,000 windfall in month 1 is invested: investments = 1,000 exactly.
    const { points } = project(
      plan({
        months: 2,
        debtMonthly: 50,
        debtDoneDestination: 'remaining',
        accounts: [cashAccount],
        windfalls: [{ id: 'refund', month: 1, amount: 1_000, destination: 'debt' }],
      }),
    );
    expect(points[1].investments).toBeCloseTo(1_000, 6);
    expect(points[2].investments).toBeCloseTo(1_000, 6);
  });

  it('is never dropped: only the part a debt doesn’t need is invested, the monthly leftover stays dropped', () => {
    // 300 owed at 0%, 100 a month, 500 windfall in month 1, remaining chosen. Budget 600 pays 300; 300 is left.
    // The windfall is the last money in, so all 300 left is windfall (≤ 500) and is invested.
    // Month 2: no debt, 100 left over, none of it windfall: dropped. Investments stay 300.
    const { points } = project(
      plan({
        months: 2,
        debtMonthly: 100,
        debtDoneDestination: 'remaining',
        debts: [{ id: 'loan', balance: 300, apr: 0, minPayment: 50 }],
        accounts: [cashAccount],
        windfalls: [{ id: 'bonus', month: 1, amount: 500, destination: 'debt' }],
      }),
    );
    expect(points[1].debt).toBeCloseTo(0, 6);
    expect(points[1].investments).toBeCloseTo(300, 6);
    expect(points[2].investments).toBeCloseTo(300, 6);
  });

  it('is never dropped: a savings windfall with every goal full is invested even when "remaining" is chosen', () => {
    // Goal already full (1,000 of 1,000), 100 a month, 800 windfall in month 1, savings done = remaining.
    // 900 can't be placed: 800 is windfall → invested; the 100 a month is dropped.
    const { points } = project(
      plan({
        months: 1,
        savingsMonthly: 100,
        savingsDoneDestination: 'remaining',
        goals: [{ id: 'fund', target: 1_000, balance: 1_000 }],
        accounts: [cashAccount],
        windfalls: [{ id: 'gift', month: 1, amount: 800, destination: 'savings' }],
      }),
    );
    expect(points[1].savings).toBeCloseTo(1_000, 6);
    expect(points[1].investments).toBeCloseTo(800, 6);
  });

  it('ignores months outside the projection', () => {
    const { points } = project(
      plan({
        months: 2,
        accounts: [cashAccount],
        windfalls: [
          { id: 'past', month: 0, amount: 999, destination: 'investments' },
          { id: 'later', month: 5, amount: 999, destination: 'investments' },
        ],
      }),
    );
    expect(points[2].investments).toBe(0);
  });
});

describe('rule 13: a promotional rate that ends', () => {
  it('charges the promotional rate until it ends, then the APR, and reports what was left when it ended', () => {
    // 1,200 at 0% for 3 months, then 24% (2% a month); 100 a month.
    // Months 1–3: 1,100, 1,000, 900. Month 4: 900 × 1.02 − 100 = 818.
    const result = project(
      plan({
        months: 4,
        debtMonthly: 100,
        debts: [{ id: 'transfer', balance: 1_200, apr: 24, minPayment: 100, promoApr: 0, promoMonths: 3 }],
      }),
    );
    expect(result.points[3].debt).toBeCloseTo(900, 6);
    expect(result.points[4].debt).toBeCloseTo(818, 6);
    expect(result.promoEndBalances).toEqual([900]);
  });

  it('reports nothing when the balance is cleared before the promotion ends', () => {
    // 300 at 0% for 3 months, 100 a month: gone in month 3.
    const result = project(
      plan({ months: 4, debtMonthly: 100, debts: [{ id: 'transfer', balance: 300, apr: 24, minPayment: 100, promoApr: 0, promoMonths: 3 }] }),
    );
    expect(result.debtFreeMonth).toBe(3);
    expect(result.promoEndBalances).toEqual([null]);
  });

  it('avalanche goes by the rate charged that month when the minimums clear the promotion in time', () => {
    // A: 100 at 0% for 6 months (25% after), min 20: after month 1's minimum 80 is left, and 5 more minimums
    // (100) clear it before the promotion ends, so it ranks at 0%. B: 1,000 at 10%, min 20. Budget 140, 100 extra.
    // Month 1: B charges 1,000 × 0.10 / 12 = 8.3333 and gets the extra: 1,008.3333 − 20 − 100 = 888.3333. A: 80.
    const result = project(
      plan({
        months: 1,
        debtMonthly: 140,
        debtStrategy: 'avalanche',
        debts: [
          { id: 'A', balance: 100, apr: 25, minPayment: 20, promoApr: 0, promoMonths: 6 },
          { id: 'B', balance: 1_000, apr: 10, minPayment: 20 },
        ],
      }),
    );
    expect(result.points[1].debtBalances[0]).toBeCloseTo(80, 6);
    expect(result.points[1].debtBalances[1]).toBeCloseTo(888.3333333, 6);
  });

  it('avalanche ranks a promotional balance by its later APR when the minimums would leave some at the end', () => {
    // A: 1,000 at 0% for 6 months (25% after), min 20: after month 1's minimum 980 is left and 5 more minimums (100)
    // won't clear it, so it ranks at 25%, above B's 10%, and gets the extra.
    // Month 1: A 1,000 − 20 − 100 = 880. B: 1,008.3333 − 20 = 988.3333.
    const result = project(
      plan({
        months: 1,
        debtMonthly: 140,
        debtStrategy: 'avalanche',
        debts: [
          { id: 'A', balance: 1_000, apr: 25, minPayment: 20, promoApr: 0, promoMonths: 6 },
          { id: 'B', balance: 1_000, apr: 10, minPayment: 20 },
        ],
      }),
    );
    expect(result.points[1].debtBalances[0]).toBeCloseTo(880, 6);
    expect(result.points[1].debtBalances[1]).toBeCloseTo(988.3333333, 6);
  });
});

describe('rule 14: sinking funds for bills that come back', () => {
  it('pays a bill due later this month (firstMonth 0) in month 1, then keeps the yearly schedule from month 0', () => {
    // Has 1,200 for a 1,200 bill due this month; 100 a month. Month 1: the fund is full, so the 100 can't go in
    // (it moves on to Investments), then the bill is paid: 0. Months 2–12: 11 × 100 = 1,100 when the next bill is due
    // in month 12, which is short: it pays 1,100, leaving 0.
    const result = project(
      plan({
        months: 13,
        savingsMonthly: 100,
        goals: [{ id: 'insurance', target: 1_200, balance: 1_200, repeat: { firstMonth: 0, everyMonths: 12 } }],
        accounts: [cashAccount],
      }),
    );
    expect(result.points[1].savings).toBe(0);
    expect(result.points[2].savings).toBeCloseTo(100, 6);
    expect(result.points[11].savings).toBeCloseTo(1_000, 6);
    expect(result.points[12].savings).toBe(0);
    expect(result.points[13].savings).toBeCloseTo(100, 6);
    expect(result.warnings.shortBills).toEqual([true]);
  });

  it('pays the bill in its month, then fills again', () => {
    // A 1,200 yearly bill due in month 12, 100 a month: 1,200 by month 12, paid, so 0. Month 13: 100.
    const result = project(
      plan({
        months: 24,
        savingsMonthly: 100,
        goals: [{ id: 'insurance', target: 1_200, balance: 0, repeat: { firstMonth: 12, everyMonths: 12 } }],
        accounts: [cashAccount],
      }),
    );
    expect(result.points[11].savings).toBeCloseTo(1_100, 6);
    expect(result.points[12].savings).toBe(0);
    expect(result.points[13].savings).toBeCloseTo(100, 6);
    // Month 24: the second bill, paid in full again.
    expect(result.points[24].savings).toBe(0);
    expect(result.goalFullMonths[0]).toBe(12);
    expect(result.warnings.shortBills).toEqual([false]);
    // A sinking fund's money is never finished, so nothing spills to Investments.
    expect(result.points[24].investments).toBe(0);
  });

  it('flags a bill the fund was short of and pays what it has', () => {
    // 50 a month toward a 1,200 bill in month 6: 300 there, all of it used.
    const result = project(
      plan({
        months: 7,
        savingsMonthly: 50,
        goals: [{ id: 'gifts', target: 1_200, balance: 0, repeat: { firstMonth: 6, everyMonths: 12 } }],
      }),
    );
    expect(result.points[6].savings).toBe(0);
    expect(result.warnings.shortBills).toEqual([true]);
  });

  it('a full sinking fund holds money back from the next goal only until its target', () => {
    // Priority: the 600 bill fund (due month 12) first, then a 10,000 goal. 200 a month:
    // months 1–3 fill the bill fund to 600; from month 4 everything goes to the second goal: 200 × 9 = 1,800 by month 12.
    const result = project(
      plan({
        months: 12,
        savingsMonthly: 200,
        goals: [
          { id: 'bill', target: 600, balance: 0, repeat: { firstMonth: 12, everyMonths: 12 } },
          { id: 'trip', target: 10_000, balance: 0 },
        ],
      }),
    );
    expect(result.points[3].goalBalances[0]).toBeCloseTo(600, 6);
    expect(result.points[12].goalBalances[1]).toBeCloseTo(1_800, 6);
    expect(result.points[12].goalBalances[0]).toBe(0);
  });
});
