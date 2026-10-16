import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { project, type ProjectionResult } from '../../lib/projection';

export type AccountType = 'Retirement401k' | 'Ira' | 'RothIra' | 'Brokerage' | 'Hsa' | 'Other';

export const accountTypeLabels: Record<AccountType, string> = {
  Retirement401k: '401(k)',
  Ira: 'IRA',
  RothIra: 'Roth IRA',
  Brokerage: 'Brokerage',
  Hsa: 'HSA',
  Other: 'Other',
};

export const DEFAULT_EXPECTED_RETURN = 7;

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  expectedReturn: number;
  sharePercent: number;
  /** Employer adds this percent of each contribution; null means no match. */
  matchPercent: number | null;
  /** …on contributions up to this percent of monthly income; null means no cap. */
  matchLimitPercent: number | null;
  sortOrder: number;
}

export interface InvestmentsData {
  /** The plan's Investments category amount. Edited in Plan, never here. */
  monthlyAmount: number;
  monthlyIncome: number;
  accounts: Account[];
}

export type AccountFields = Omit<Account, 'id' | 'sortOrder' | 'sharePercent'>;

export const investmentsQueryKey = ['investments'] as const;

export function useInvestments() {
  return useQuery({ queryKey: investmentsQueryKey, queryFn: () => api.get<InvestmentsData>('/investments') });
}

function useAccountsCache() {
  const queryClient = useQueryClient();
  return (update: (accounts: Account[]) => Account[]) =>
    queryClient.setQueryData<InvestmentsData>(investmentsQueryKey, (data) => (data ? { ...data, accounts: update(data.accounts) } : data));
}

export function useAddAccount() {
  const change = useAccountsCache();
  return useMutation({
    mutationFn: (account: AccountFields) => api.post<Account>('/investments/accounts', account),
    onSuccess: (account) => change((accounts) => [...accounts, account]),
  });
}

export function useSaveAccount() {
  const change = useAccountsCache();
  return useMutation({
    mutationFn: ({ id, account }: { id: string; account: AccountFields }) => api.put<Account>(`/investments/accounts/${id}`, account),
    onSuccess: (account) => change((accounts) => accounts.map((a) => (a.id === account.id ? account : a))),
  });
}

/** The server answers with the accounts that are left, since deleting can change another account's share. */
export function useDeleteAccount() {
  const change = useAccountsCache();
  return useMutation({
    mutationFn: (id: string) => api.delete<Account[]>(`/investments/accounts/${id}`),
    onSuccess: (remaining) => change(() => remaining),
  });
}

/** Shares for every account at once; they must total 100. */
export function useSetSplit() {
  const change = useAccountsCache();
  return useMutation({
    mutationFn: (shares: { id: string; sharePercent: number }[]) => api.put<Account[]>('/investments/split', { shares }),
    onSuccess: (accounts) => change(() => accounts),
  });
}

/** How far the Invest page looks ahead: 30 years. */
export const INVEST_HORIZON_YEARS = 30;
export const MILESTONE_YEARS = [5, 10, 20, 30];

export interface YearPoint {
  year: number;
  value: number;
  /** Today's balances plus everything you put in. */
  contributed: number;
  /** What the employer added. */
  matched: number;
  growth: number;
}

export interface InvestmentProjection {
  result: ProjectionResult;
  /** One entry per year, from today (year 0) to the horizon. */
  years: YearPoint[];
  totalToday: number;
  sharesTotal: number;
  /** Employer money next month. */
  matchNextMonth: number;
}

/**
 * Runs the shared projection engine for the investment accounts alone. `incomeGrowthRate` is the yearly raise
 * from Assumptions: the employer match is capped at a share of income, so without it the match figures here would
 * fall behind the dashboard's from year two on.
 */
export function useInvestmentProjection(data: InvestmentsData, incomeGrowthRate = 0): InvestmentProjection {
  return useMemo(() => {
    const result = project({
      months: INVEST_HORIZON_YEARS * 12,
      monthlyIncome: data.monthlyIncome,
      incomeGrowthRate,
      savingsMonthly: 0,
      debtMonthly: 0,
      investmentsMonthly: data.monthlyAmount,
      goals: [],
      debts: [],
      accounts: data.accounts.map((a) => ({
        id: a.id,
        balance: a.balance,
        expectedReturn: a.expectedReturn,
        sharePercent: a.sharePercent,
        matchPercent: a.matchPercent ?? undefined,
        matchLimitPercent: a.matchLimitPercent ?? undefined,
      })),
    });

    const totalToday = data.accounts.reduce((sum, a) => sum + a.balance, 0);
    const years = Array.from({ length: INVEST_HORIZON_YEARS + 1 }, (_, year): YearPoint => {
      const point = result.points[year * 12];
      return {
        year,
        value: point.investments,
        contributed: totalToday + point.investedToDate,
        matched: point.matchedToDate,
        growth: point.investmentGrowthToDate,
      };
    });

    return {
      result,
      years,
      totalToday,
      sharesTotal: data.accounts.reduce((sum, a) => sum + a.sharePercent, 0),
      matchNextMonth: result.points[1]?.matchedToDate ?? 0,
    };
  }, [data, incomeGrowthRate]);
}
