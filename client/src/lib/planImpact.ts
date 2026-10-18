import { compoundGrowth } from './calculators';
import { DEFAULT_EXPECTED_RETURN, type ProjectionResult } from './projection';

/**
 * "Move a dollar, see your future": what a change to the plan does, and what a monthly habit costs.
 * Pure functions on top of the projection engine. Rates are percents (7 means 7%).
 */

/** How far ahead the Plan page looks when it compares two plans or prices a habit. */
export const IMPACT_YEARS = 10;

export interface PlanImpact {
  debtFree: {
    /** Months from now; 0 means no debt today, null means not within the projection. */
    before: number | null;
    after: number | null;
    /** Positive: debt-free that many months sooner. Negative: later. Null when either plan never gets there. */
    monthsSooner: number | null;
  };
  netWorth: {
    before: number;
    after: number;
    /** After minus before, at `years` from now. */
    change: number;
  };
}

/** Compares two projections of the same person: the plan as it was, and the plan as it is being edited. */
export function comparePlans(before: ProjectionResult, after: ProjectionResult, years: number = IMPACT_YEARS): PlanImpact {
  const month = Math.min(years * 12, before.points.length - 1, after.points.length - 1);
  const netWorthBefore = before.points[month].netWorth;
  const netWorthAfter = after.points[month].netWorth;

  return {
    debtFree: {
      before: before.debtFreeMonth,
      after: after.debtFreeMonth,
      monthsSooner: before.debtFreeMonth === null || after.debtFreeMonth === null ? null : before.debtFreeMonth - after.debtFreeMonth,
    },
    netWorth: { before: netWorthBefore, after: netWorthAfter, change: netWorthAfter - netWorthBefore },
  };
}

/**
 * The return the plan's monthly investing is expected to earn: each account's expected return,
 * weighted by its share of the monthly amount. With no usable shares the accounts count equally;
 * with no accounts it is the default 7%.
 */
export function planExpectedReturn(accounts: { expectedReturn: number; sharePercent: number }[]): number {
  if (accounts.length === 0) return DEFAULT_EXPECTED_RETURN;
  const shares = accounts.map((account) => Math.max(0, account.sharePercent));
  const totalShare = shares.reduce((sum, share) => sum + share, 0);
  if (totalShare === 0) return accounts.reduce((sum, account) => sum + account.expectedReturn, 0) / accounts.length;
  return accounts.reduce((sum, account, i) => sum + account.expectedReturn * shares[i], 0) / totalShare;
}

/** What a monthly amount would grow to if it were invested instead, at a yearly return, after some years. */
export function habitCost(monthly: number, annualReturn: number, years: number = IMPACT_YEARS, inflationRate = 0): number {
  if (monthly <= 0) return 0;
  const rows = compoundGrowth({ initial: 0, monthly, annualRate: annualReturn, years });
  // In today's dollars (like the dashboard) when an inflation rate is given.
  return rows[rows.length - 1].value / Math.pow(1 + Math.max(0, inflationRate) / 100, years);
}
