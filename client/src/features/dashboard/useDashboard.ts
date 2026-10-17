import { useMemo } from 'react';
import {
  project,
  type DebtStrategy,
  type FreedMoneyDestination,
  type ProjectionInput,
  type ProjectionResult,
  type SavingsSplitMode,
} from '../../lib/projection';
import { yearMonthFromNow } from '../../lib/dates';
import { buildTimeline, type TimelineItem } from '../../lib/timeline';
import { toDebtInput, useDebts, type DebtsData } from '../debt/debts';
import { toAccountInput, useInvestments, type InvestmentsData } from '../invest/investments';
import { planTotals, usePlan, type CategoryKind, type Plan } from '../plan/plan';
import { useSavings, type SavingsData } from '../savings/savings';
import { toWindfallInputs, useNetWorth, type NetWorthData } from './networth';
import { retirementOutlook } from './retirementOutlook';

/** The dashboard slider: 0 to 40 years. */
export const DASHBOARD_YEARS = 40;

export interface DashboardData {
  plan: Plan;
  debts: DebtsData;
  savings: SavingsData;
  investments: InvestmentsData;
  netWorth: NetWorthData;
}

/** Everything the dashboard shows, from the plan, the three modules and the net-worth extras. */
export function useDashboardData() {
  const queries = [usePlan(), useDebts(), useSavings(), useInvestments(), useNetWorth()] as const;
  const [plan, debts, savings, investments, netWorth] = queries;

  const failed = queries.find((query) => query.isError);
  // Kept as the same object until one of the five changes, so pages can memoize what they build from it.
  const data: DashboardData | undefined = useMemo(
    () =>
      plan.data && debts.data && savings.data && investments.data && netWorth.data
        ? { plan: plan.data, debts: debts.data, savings: savings.data, investments: investments.data, netWorth: netWorth.data }
        : undefined,
    [plan.data, debts.data, savings.data, investments.data, netWorth.data],
  );

  return {
    data,
    isPending: !data && !failed,
    error: failed?.error,
    refetch: () => queries.forEach((query) => query.refetch()),
  };
}

const categoryAmount = (plan: Plan, kind: CategoryKind) => plan.categories.find((c) => c.kind === kind)?.amount ?? 0;

/** The whole picture as one input for the projection engine. */
export function buildProjectionInput(data: DashboardData, todaysDollars: boolean): ProjectionInput {
  const { plan, debts, savings, investments, netWorth } = data;

  return {
    months: DASHBOARD_YEARS * 12,
    monthlyIncome: plan.monthlyIncome,
    remaining: planTotals(plan).remaining,
    savingsMonthly: categoryAmount(plan, 'Savings'),
    debtMonthly: categoryAmount(plan, 'Debt'),
    investmentsMonthly: categoryAmount(plan, 'Investment'),
    goals: savings.goals.map((g) => ({ id: g.id, target: g.targetAmount, balance: g.currentBalance, apy: g.apy, sharePercent: g.sharePercent })),
    savingsSplitMode: savings.splitMode.toLowerCase() as SavingsSplitMode,
    debts: debts.debts.map((d) => toDebtInput(d)),
    debtStrategy: debts.strategy.toLowerCase() as DebtStrategy,
    accounts: investments.accounts.map(toAccountInput),
    windfalls: toWindfallInputs(netWorth.windfalls ?? []),
    otherItems: netWorth.items.map((i) => ({ id: i.id, value: i.value, kind: (i.kind === 'Asset' ? 'asset' : 'liability') as 'asset' | 'liability', yearlyChange: i.yearlyChangePercent })),
    debtDoneDestination: netWorth.settings.debtDoneDestination.toLowerCase() as FreedMoneyDestination,
    savingsDoneDestination: netWorth.settings.savingsDoneDestination.toLowerCase() as FreedMoneyDestination,
    todaysDollars,
    inflationRate: netWorth.settings.inflationRate,
    incomeGrowthRate: netWorth.settings.incomeGrowthRate,
    raiseDestination: netWorth.settings.raiseToInvestments ? 'investments' : 'remaining',
  };
}

export interface DashboardProjection {
  result: ProjectionResult;
  /** The dated roadmap: debt payoffs, goals and net-worth steps, earliest first. */
  timeline: TimelineItem[];
}

export function useDashboardProjection(data: DashboardData, todaysDollars: boolean): DashboardProjection {
  return useMemo(() => {
    const result = project(buildProjectionInput(data, todaysDollars));
    const timeline = buildTimeline(result, {
      debts: data.debts.debts.map((d) => d.name),
      goals: data.savings.goals.map((g) => g.name),
      minimumOnly: data.debts.debts.map((d) => d.minimumOnly),
      windfalls: windfallNames(data),
      retirement: retirementOnTimeline(data),
    });
    return { result, timeline };
  }, [data, todaysDollars]);
}

/** The retirement number for the timeline, once the person has set it up (a birth year or their own spending). */
function retirementOnTimeline(data: DashboardData): { amount: number; month: number | null } | undefined {
  const settings = data.netWorth.settings.retirement;
  if (!settings || (settings.birthYear === null && settings.spendingMonthly === null)) return undefined;
  const outlook = retirementOutlook(data);
  return outlook.number > 0 ? { amount: outlook.number, month: outlook.month } : undefined;
}

/** Upcoming one-time money with the projection month it lands in, for the timeline. */
export function windfallNames(data: DashboardData): { id: string; name: string; amount: number; month: number }[] {
  const byId = new Map((data.netWorth.windfalls ?? []).map((w) => [w.id, w]));
  return toWindfallInputs(data.netWorth.windfalls ?? []).map((w) => ({ id: w.id, name: byId.get(w.id)?.name ?? '', amount: w.amount, month: w.month }));
}

/** The asset and liability lines under the net worth card, read from the projection at a month. */
export interface NetWorthBreakdown {
  /** Home items' value (the Home type, owned). Null when there is none. */
  home: number | null;
  /** Every other owned item. */
  otherOwned: number;
  /** Debts from the Debt page. */
  debtPage: number;
  /** "I owe" items, which live on the Assets page. Null when there are none. */
  otherOwed: number | null;
}

export function netWorthBreakdownAt(data: DashboardData, result: ProjectionResult, month: number): NetWorthBreakdown {
  const point = result.points[Math.min(month, result.points.length - 1)];
  const sumWhere = (keep: (item: DashboardData['netWorth']['items'][number]) => boolean) =>
    data.netWorth.items.reduce((sum, item, i) => (keep(item) ? sum + point.otherItemValues[i] : sum), 0);
  const hasHome = data.netWorth.items.some((item) => item.kind === 'Asset' && item.type === 'Home');
  const hasOwed = data.netWorth.items.some((item) => item.kind === 'Liability');
  return {
    home: hasHome ? sumWhere((item) => item.kind === 'Asset' && item.type === 'Home') : null,
    otherOwned: sumWhere((item) => item.kind === 'Asset' && item.type !== 'Home'),
    debtPage: point.debt,
    otherOwed: hasOwed ? sumWhere((item) => item.kind === 'Liability') : null,
  };
}

/**
 * Home equity at a month: every Home item's value less every Mortgage debt's balance, read from the projection
 * so it moves with the home's yearly change and the loan's paydown. Null when there is no Home item.
 */
export function homeEquityAt(data: DashboardData, result: ProjectionResult, month: number): number | null {
  const point = result.points[Math.min(month, result.points.length - 1)];
  const homes = data.netWorth.items.flatMap((item, i) => (item.type === 'Home' && item.kind === 'Asset' ? [point.otherItemValues[i]] : []));
  if (homes.length === 0) return null;
  const mortgages = data.debts.debts.flatMap((debt, i) => (debt.type === 'Mortgage' ? [point.debtBalances[i]] : []));
  return homes.reduce((sum, v) => sum + v, 0) - mortgages.reduce((sum, v) => sum + v, 0);
}

/** The forward-looking numbers the emails and the check-in recap share, always in actual dollars. */
export interface Outlook {
  /** False when there is no debt at all, so "debt-free" means nothing. */
  hasDebt: boolean;
  /** Months from now, or null when not within the projection. */
  debtFreeMonth: number | null;
  netWorthIn10Years: number;
}

export function outlookOf(result: ProjectionResult): Outlook {
  return {
    hasDebt: result.debtPayoffMonths.some((month) => month !== 0),
    debtFreeMonth: result.debtFreeMonth,
    netWorthIn10Years: result.points[Math.min(120, result.points.length - 1)].netWorth,
  };
}

/**
 * What the server's emails ask for: the debt-free month only when there is debt (with the month this screen shows
 * for it, so the email can't name a different one), and the 10-year figure in whole dollars.
 */
export function outlookForEmail(outlook: Outlook, now: Date = new Date()): { debtFreeMonth: number | null; debtFreeOn: string | null; netWorthIn10Years: number } {
  const debtFreeMonth = outlook.hasDebt ? outlook.debtFreeMonth : null;
  return {
    debtFreeMonth,
    debtFreeOn: debtFreeMonth != null && debtFreeMonth > 0 ? yearMonthFromNow(debtFreeMonth, now) : null,
    netWorthIn10Years: Math.round(outlook.netWorthIn10Years),
  };
}
