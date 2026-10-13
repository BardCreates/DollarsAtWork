import { useMemo } from 'react';
import {
  project,
  type DebtStrategy,
  type FreedMoneyDestination,
  type ProjectionInput,
  type ProjectionResult,
  type SavingsSplitMode,
} from '../../lib/projection';
import { buildTimeline, type TimelineItem } from '../../lib/timeline';
import { useDebts, type DebtsData } from '../debt/debts';
import { useInvestments, type InvestmentsData } from '../invest/investments';
import { planTotals, usePlan, type CategoryKind, type Plan } from '../plan/plan';
import { useSavings, type SavingsData } from '../savings/savings';
import { useNetWorth, type NetWorthData } from './networth';

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
  const data: DashboardData | undefined =
    plan.data && debts.data && savings.data && investments.data && netWorth.data
      ? { plan: plan.data, debts: debts.data, savings: savings.data, investments: investments.data, netWorth: netWorth.data }
      : undefined;

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
  const otherTotal = (kind: 'Asset' | 'Liability') => netWorth.items.filter((i) => i.kind === kind).reduce((sum, i) => sum + i.value, 0);

  return {
    months: DASHBOARD_YEARS * 12,
    monthlyIncome: plan.monthlyIncome,
    remaining: planTotals(plan).remaining,
    savingsMonthly: categoryAmount(plan, 'Savings'),
    debtMonthly: categoryAmount(plan, 'Debt'),
    investmentsMonthly: categoryAmount(plan, 'Investment'),
    goals: savings.goals.map((g) => ({ id: g.id, target: g.targetAmount, balance: g.currentBalance, apy: g.apy, sharePercent: g.sharePercent })),
    savingsSplitMode: savings.splitMode.toLowerCase() as SavingsSplitMode,
    debts: debts.debts.map((d) => ({ id: d.id, balance: d.balance, apr: d.apr, minPayment: d.minPayment })),
    debtStrategy: debts.strategy.toLowerCase() as DebtStrategy,
    accounts: investments.accounts.map((a) => ({
      id: a.id,
      balance: a.balance,
      expectedReturn: a.expectedReturn,
      sharePercent: a.sharePercent,
      matchPercent: a.matchPercent ?? undefined,
      matchLimitPercent: a.matchLimitPercent ?? undefined,
    })),
    otherAssets: otherTotal('Asset'),
    otherLiabilities: otherTotal('Liability'),
    debtDoneDestination: netWorth.settings.debtDoneDestination.toLowerCase() as FreedMoneyDestination,
    savingsDoneDestination: netWorth.settings.savingsDoneDestination.toLowerCase() as FreedMoneyDestination,
    todaysDollars,
    inflationRate: netWorth.settings.inflationRate,
    incomeGrowthRate: netWorth.settings.incomeGrowthRate,
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
    });
    return { result, timeline };
  }, [data, todaysDollars]);
}
