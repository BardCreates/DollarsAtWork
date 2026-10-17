import type { ProjectionInput } from './projection';
import { retirementNumber } from './retirement';

/**
 * The made-up person shown on the public demo page, so a visitor can see a plan working without signing up.
 * "Alex" takes home $5,500 a month and has a credit card, a car loan, a sinking fund for car insurance, a small
 * emergency fund, a 401(k) with a match, and a tax refund on the way.
 */

export const SAMPLE_PERSON = {
  name: 'Alex',
  blurb:
    'takes home $5,500 a month, owes $17,700 on a credit card and a car loan, has $2,800 saved and $18,000 in a 401(k), and expects a $1,800 tax refund.',
} as const;

/** Names for the roadmap, in the same order as the debts, goals and windfalls below. */
export const SAMPLE_NAMES = { debts: ['Visa', 'Car loan'], goals: ['Car insurance', 'Emergency fund'] } as const;

/** The tax refund: in month 5, straight onto debt. */
export const SAMPLE_WINDFALL = { id: 'refund', name: 'Tax refund', amount: 1_800, month: 5 } as const;

/** Alex is 32 and expects to spend about $4,200 a month in retirement, in today's dollars. */
export const SAMPLE_RETIREMENT = { age: 32, spendingMonthly: 4_200, number: retirementNumber(4_200) } as const;

/** The most extra a visitor can put toward debt in the demo. */
export const SAMPLE_MAX_EXTRA = 600;

/**
 * Alex's plan as projection input, in today's dollars like the app's dashboard. `extraToDebt` is "move a dollar"
 * in the demo: more each month toward debt, taken from what would otherwise be spent.
 */
export function sampleInput(extraToDebt = 0): ProjectionInput {
  return {
    months: 480,
    monthlyIncome: 5_500,
    savingsMonthly: 400,
    debtMonthly: 650 + Math.max(0, extraToDebt),
    investmentsMonthly: 300,
    goals: [
      // $1,200 a year, due in 6 months: a sinking fund that pays the bill and fills again.
      { id: 'insurance', target: 1_200, balance: 300, repeat: { firstMonth: 6, everyMonths: 12 } },
      { id: 'emergency', target: 12_000, balance: 2_500, apy: 4 },
    ],
    debts: [
      { id: 'visa', balance: 4_200, apr: 22.99, minPayment: 110 },
      { id: 'car', balance: 13_500, apr: 6.5, minPayment: 310 },
    ],
    debtStrategy: 'avalanche',
    // $350 a month already comes out of each paycheck; the salary is $90,000 a year, and the match is 50% up to 6% of it.
    accounts: [
      { id: '401k', balance: 18_000, expectedReturn: 7, sharePercent: 100, matchPercent: 50, matchLimitPercent: 6, payrollMonthly: 350, matchSalaryMonthly: 7_500 },
    ],
    windfalls: [{ id: SAMPLE_WINDFALL.id, month: SAMPLE_WINDFALL.month, amount: SAMPLE_WINDFALL.amount, destination: 'debt' }],
    todaysDollars: true,
  };
}
