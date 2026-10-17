import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { project, type DebtInput, type DebtStrategy as EngineStrategy, type ProjectionInput, type ProjectionResult } from '../../lib/projection';
import { monthsUntilYearMonth } from '../../lib/dates';
import { debtFreeExcept } from '../../lib/timeline';
import { savingsQueryKey } from '../savings/savings';

export type DebtType = 'CreditCard' | 'Auto' | 'Student' | 'Mortgage' | 'Medical' | 'Other';
export type DebtStrategy = 'Snowball' | 'Avalanche' | 'Custom';

export const debtTypeLabels: Record<DebtType, string> = {
  CreditCard: 'Credit card',
  Auto: 'Auto loan',
  Student: 'Student loan',
  Mortgage: 'Mortgage',
  Medical: 'Medical',
  Other: 'Other',
};

export const strategyInfo: Record<DebtStrategy, { label: string; description: string }> = {
  Snowball: { label: 'Snowball', description: 'Extra money goes to the smallest balance first, for quick wins.' },
  Avalanche: { label: 'Avalanche', description: 'Extra money goes to the highest APR first, which costs the least interest.' },
  Custom: { label: 'Custom', description: 'Extra money follows your own order. Drag the debts to set it.' },
};

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  apr: number;
  minPayment: number;
  /** Pay only the minimum and keep it out of the payoff order (a mortgage). "Debt-free" skips it. */
  minimumOnly: boolean;
  /** A promotional rate (0 for a 0% balance transfer) charged through promoEndsMonth; null for none. */
  promoApr: number | null;
  /** "2027-06": the last month the promotional rate applies; null for none. */
  promoEndsMonth: string | null;
  sortOrder: number;
}

export interface DebtsData {
  strategy: DebtStrategy;
  /** The plan's Debt category amount, read from the plan; the banner writes changes back to that category. */
  monthlyBudget: number;
  debts: Debt[];
}

export type DebtFields = Omit<Debt, 'id' | 'sortOrder'>;

/**
 * A debt as the projection engine takes it. The promotion lasts from month 1 through its last calendar month, so a
 * promotion ending this month (or earlier) no longer changes anything.
 */
export function toDebtInput(d: Debt, from: Date = new Date()): DebtInput {
  const promoMonths = d.promoEndsMonth ? (monthsUntilYearMonth(d.promoEndsMonth, from) ?? 0) : 0;
  return {
    id: d.id,
    balance: d.balance,
    apr: d.apr,
    minPayment: d.minPayment,
    minimumOnly: d.minimumOnly,
    ...(promoMonths > 0 ? { promoApr: d.promoApr ?? 0, promoMonths } : {}),
  };
}

export const debtsQueryKey = ['debts'] as const;

export function useDebts() {
  return useQuery({ queryKey: debtsQueryKey, queryFn: () => api.get<DebtsData>('/debts') });
}

function useDebtsCache() {
  const queryClient = useQueryClient();
  return {
    change: (update: (data: DebtsData) => DebtsData) =>
      queryClient.setQueryData<DebtsData>(debtsQueryKey, (data) => (data ? update(data) : data)),
    changeNow: async (update: (data: DebtsData) => DebtsData) => {
      await queryClient.cancelQueries({ queryKey: debtsQueryKey });
      queryClient.setQueryData<DebtsData>(debtsQueryKey, (data) => (data ? update(data) : data));
    },
    reload: () => queryClient.invalidateQueries({ queryKey: debtsQueryKey }),
    /** The emergency fund starter on Savings counts every debt's minimum, so a changed debt changes it too. */
    refreshSavings: () => queryClient.invalidateQueries({ queryKey: savingsQueryKey }),
  };
}

export function useAddDebt() {
  const cache = useDebtsCache();
  return useMutation({
    mutationFn: (debt: DebtFields) => api.post<Debt>('/debts', debt),
    onSuccess: (debt) => {
      cache.change((data) => ({ ...data, debts: [...data.debts, debt] }));
      cache.refreshSavings();
    },
  });
}

export function useUpdateDebt() {
  const cache = useDebtsCache();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<DebtFields> }) => api.patch<Debt>(`/debts/${id}`, changes),
    onSuccess: (debt) => {
      cache.change((data) => ({ ...data, debts: data.debts.map((d) => (d.id === debt.id ? debt : d)) }));
      cache.refreshSavings();
    },
  });
}

export function useDeleteDebt() {
  const cache = useDebtsCache();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: (_, id) => {
      cache.change((data) => ({ ...data, debts: data.debts.filter((d) => d.id !== id) }));
      cache.refreshSavings();
    },
  });
}

export function useReorderDebts() {
  const cache = useDebtsCache();
  return useMutation({
    mutationFn: (ids: string[]) => api.put('/debts/order', { ids }),
    onMutate: (ids) =>
      cache.changeNow((data) => {
        const byId = new Map(data.debts.map((d) => [d.id, d]));
        return { ...data, debts: ids.flatMap((id, index) => (byId.has(id) ? [{ ...byId.get(id)!, sortOrder: index }] : [])) };
      }),
    onError: cache.reload,
  });
}

export function useSetDebtStrategy() {
  const cache = useDebtsCache();
  return useMutation({
    mutationFn: (strategy: DebtStrategy) => api.put('/debts/strategy', { strategy }),
    onMutate: (strategy) => cache.changeNow((data) => ({ ...data, strategy })),
    onError: cache.reload,
  });
}

/** The furthest the projection looks ahead: 40 years. */
export const DEBT_HORIZON_MONTHS = 480;

export interface DebtProjection {
  /** Following the plan: the monthly budget and the chosen strategy. */
  planned: ProjectionResult;
  /** Paying only each debt's minimum, for comparison. */
  minimumsOnly: ProjectionResult;
  totalDebt: number;
  minimumsDue: number;
  /** Minimum-only debts (a mortgage) still open when "debt-free" arrives, by name. */
  debtFreeExcept: string[];
}

/**
 * Runs the shared projection engine. `whole` is the dashboard's input for the whole plan (built with this
 * page's debts), so the debt-free date here matches the dashboard's: money freed by full savings goals can
 * reach the debts there, and must here too. Without it (the rest of the plan failed to load) the debts are
 * projected alone.
 */
export function useDebtProjection(data: DebtsData, whole?: ProjectionInput): DebtProjection {
  return useMemo(() => {
    const input = {
      months: DEBT_HORIZON_MONTHS,
      monthlyIncome: 0,
      savingsMonthly: 0,
      investmentsMonthly: 0,
      debtMonthly: data.monthlyBudget,
      goals: [],
      accounts: [],
      debts: data.debts.map((d) => toDebtInput(d)),
      debtStrategy: data.strategy.toLowerCase() as EngineStrategy,
      // Fallback only (the rest of the plan failed to load): the debts alone.
      debtDoneDestination: 'remaining' as const,
    };
    const planned = project(whole ? { ...whole, months: DEBT_HORIZON_MONTHS, todaysDollars: false } : input);
    return {
      planned,
      minimumsOnly: project({ ...input, minimumsOnly: true }),
      totalDebt: data.debts.reduce((sum, d) => sum + d.balance, 0),
      minimumsDue: data.debts.reduce((sum, d) => sum + Math.min(d.minPayment, d.balance), 0),
      debtFreeExcept: debtFreeExcept(planned, { debts: data.debts.map((d) => d.name), goals: [], minimumOnly: data.debts.map((d) => d.minimumOnly) }),
    };
  }, [data, whole]);
}
