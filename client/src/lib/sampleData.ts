import type { ProjectionInput } from './projection';

/**
 * The made-up person shown on the public demo page, so a visitor can see a plan working without signing up.
 * "Alex" takes home $5,500 a month and has a credit card, a car loan, a small emergency fund and a 401(k).
 */

export const SAMPLE_PERSON = {
  name: 'Alex',
  blurb: 'takes home $5,500 a month, owes $17,700 on a credit card and a car loan, has $2,500 saved and $18,000 in a 401(k).',
} as const;

/** Names for the roadmap, in the same order as the debts and goals below. */
export const SAMPLE_NAMES = { debts: ['Visa', 'Car loan'], goals: ['Emergency fund'] } as const;

/** The most extra a visitor can put toward debt in the demo. */
export const SAMPLE_MAX_EXTRA = 600;

/**
 * Alex's plan as projection input. `extraToDebt` is "move a dollar" in the demo: more each month toward debt,
 * taken from what would otherwise be spent.
 */
export function sampleInput(extraToDebt = 0): ProjectionInput {
  return {
    months: 480,
    monthlyIncome: 5_500,
    savingsMonthly: 400,
    debtMonthly: 650 + Math.max(0, extraToDebt),
    investmentsMonthly: 600,
    goals: [{ id: 'emergency', target: 12_000, balance: 2_500, apy: 4 }],
    debts: [
      { id: 'visa', balance: 4_200, apr: 22.99, minPayment: 110 },
      { id: 'car', balance: 13_500, apr: 6.5, minPayment: 310 },
    ],
    debtStrategy: 'avalanche',
    accounts: [{ id: '401k', balance: 18_000, expectedReturn: 7, sharePercent: 100, matchPercent: 50, matchLimitPercent: 6 }],
  };
}
