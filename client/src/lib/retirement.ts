import { project, type ProjectionInput, type ProjectionResult } from './projection';

/**
 * The retirement number: how much invested money would pay for retirement, by the common "4% rule" (spend about 4%
 * of it in the first year, then the same amount raised with inflation). A rule of thumb from US market history for
 * about 30-year retirements, not a promise. Everything here is in today's dollars.
 */
export const WITHDRAWAL_RATE = 4;

/** Yearly spending in retirement, less other income (Social Security, a pension), times 25. */
export function retirementNumber(spendingMonthly: number, otherIncomeMonthly = 0): number {
  const gap = Math.max(0, spendingMonthly - Math.max(0, otherIncomeMonthly));
  return (gap * 12 * 100) / WITHDRAWAL_RATE;
}

/** The first month invested money reaches the number, or null if it doesn't within the projection. */
export function monthNumberReached(result: ProjectionResult, number: number): number | null {
  if (number <= 0) return 0;
  const point = result.points.find((p) => p.investments >= number);
  return point ? point.month : null;
}

/** How old someone born in `birthYear` is in the calendar year `months` from now. */
export function ageInMonths(birthYear: number, months: number, now: Date = new Date()): number {
  const year = new Date(now.getFullYear(), now.getMonth() + months, 1).getFullYear();
  return year - birthYear;
}

/**
 * About how much more to invest each month, on top of the plan, to reach the number by a month: the smallest extra
 * (to the dollar) that gets there, found by halving. Null when even $100,000 more a month wouldn't, or when there's
 * no time left. `input` should be in today's dollars, like the number.
 */
export function extraMonthlyToReach(input: ProjectionInput, number: number, byMonth: number): number | null {
  if (byMonth < 1) return null;
  const reaches = (extra: number) => {
    const result = project({ ...input, months: byMonth, investmentsMonthly: input.investmentsMonthly + extra });
    return result.points[byMonth].investments >= number;
  };
  if (reaches(0)) return 0;
  let high = 100_000;
  if (!reaches(high)) return null;
  let low = 0;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (reaches(middle)) high = middle;
    else low = middle;
  }
  return high;
}
