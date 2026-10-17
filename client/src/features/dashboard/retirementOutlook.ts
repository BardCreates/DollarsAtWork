import { monthsUntilYearMonth } from '../../lib/dates';
import { project } from '../../lib/projection';
import { ageInMonths, extraMonthlyToReach, monthNumberReached, retirementNumber } from '../../lib/retirement';
import { buildProjectionInput, DASHBOARD_YEARS, type DashboardData } from './useDashboard';

export interface RetirementOutlook {
  /** Monthly spending the number is built on, in today's dollars. */
  spending: number;
  /** True when that spending is the plan's everyday categories, not a figure the person chose. */
  fromPlan: boolean;
  otherIncome: number;
  /** In today's dollars. 0 when there's nothing to fund. */
  number: number;
  /** When invested money reaches it: 0 already, null not within 40 years. */
  month: number | null;
  /** Age in that month's year, when the birth year is known. */
  age: number | null;
  /** The month of the chosen retirement age (January of that year), when both are set and it's ahead. */
  targetMonth: number | null;
  /** About how much more a month reaches the number by the chosen age; 0 when on track, null when unknown or out of reach. */
  extraToTarget: number | null;
}

/** The plan's everyday spending: every category that isn't Savings, Debt or Investments. */
export function everydaySpending(data: DashboardData): number {
  return data.plan.categories.filter((c) => c.kind === 'Custom').reduce((sum, c) => sum + c.amount, 0);
}

/**
 * The retirement number and when the plan gets there, all in today's dollars so the number means what it buys now.
 * `withExtra` also works out the extra a month for the chosen age, which runs the projection a few more times.
 */
export function retirementOutlook(data: DashboardData, withExtra = false, now: Date = new Date()): RetirementOutlook {
  const settings = data.netWorth.settings.retirement;
  const fromPlan = settings.spendingMonthly === null;
  const spending = settings.spendingMonthly ?? everydaySpending(data);
  const otherIncome = settings.otherIncomeMonthly ?? 0;
  const number = retirementNumber(spending, otherIncome);

  const input = buildProjectionInput(data, true);
  const month = monthNumberReached(project(input), number);
  const age = settings.birthYear !== null && month !== null ? ageInMonths(settings.birthYear, month, now) : null;

  let targetMonth: number | null = null;
  if (settings.birthYear !== null && settings.retirementAge !== null) {
    const months = monthsUntilYearMonth(`${settings.birthYear + settings.retirementAge}-01`, now);
    targetMonth = months !== null && months >= 1 ? Math.min(months, DASHBOARD_YEARS * 12) : null;
  }
  const onTrack = month !== null && targetMonth !== null && month <= targetMonth;
  const extraToTarget = targetMonth === null || number <= 0 ? null : onTrack ? 0 : withExtra ? extraMonthlyToReach(input, number, targetMonth) : null;

  return { spending, fromPlan, otherIncome, number, month, age, targetMonth, extraToTarget };
}
