import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { debtsQueryKey } from '../debt/debts';
import { investmentsQueryKey } from '../invest/investments';
import { savingsQueryKey } from '../savings/savings';

export type Destination = 'Investments' | 'Savings' | 'Debt' | 'Remaining';
export type OtherItemKind = 'Asset' | 'Liability';
export type OtherItemType = 'Home' | 'Vehicle' | 'Cash' | 'Valuables' | 'Business' | 'Loan' | 'Other';

export const destinationLabels: Record<Destination, string> = {
  Investments: 'Investments',
  Savings: 'Savings goals',
  Debt: 'Debt payoff',
  Remaining: "Back to Remaining (don't project it)",
};

export const otherItemTypeLabels: Record<OtherItemType, string> = {
  Home: 'Home',
  Vehicle: 'Vehicle',
  Cash: 'Cash',
  Valuables: 'Valuables',
  Business: 'Business',
  Loan: 'Loan',
  Other: 'Other',
};

export interface Settings {
  debtDoneDestination: Destination;
  savingsDoneDestination: Destination;
  inflationRate: number;
  incomeGrowthRate: number;
}

export interface OtherItem {
  id: string;
  name: string;
  kind: OtherItemKind;
  type: OtherItemType;
  value: number;
  sortOrder: number;
}

export interface Snapshot {
  /** "2026-10-12" */
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
  /** Totals by area at that check-in; null for check-ins made before these were recorded. */
  savings: number | null;
  investments: number | null;
  debts: number | null;
}

export interface NetWorthData {
  settings: Settings;
  items: OtherItem[];
  snapshots: Snapshot[];
}

export type OtherItemFields = Omit<OtherItem, 'id' | 'sortOrder'>;

export const netWorthQueryKey = ['networth'] as const;

export function useNetWorth() {
  return useQuery({ queryKey: netWorthQueryKey, queryFn: () => api.get<NetWorthData>('/networth') });
}

function useNetWorthCache() {
  const queryClient = useQueryClient();
  return (update: (data: NetWorthData) => NetWorthData) =>
    queryClient.setQueryData<NetWorthData>(netWorthQueryKey, (data) => (data ? update(data) : data));
}

export function useSaveSettings() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: (settings: Settings) => api.put<Settings>('/networth/settings', settings),
    onSuccess: (settings) => change((data) => ({ ...data, settings })),
  });
}

export function useAddOtherItem() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: (item: OtherItemFields) => api.post<OtherItem>('/networth/items', item),
    onSuccess: (item) => change((data) => ({ ...data, items: [...data.items, item] })),
  });
}

export function useSaveOtherItem() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: ({ id, item }: { id: string; item: OtherItemFields }) => api.put<OtherItem>(`/networth/items/${id}`, item),
    onSuccess: (item) => change((data) => ({ ...data, items: data.items.map((i) => (i.id === item.id ? item : i)) })),
  });
}

export function useDeleteOtherItem() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/networth/items/${id}`),
    onSuccess: (_, id) => change((data) => ({ ...data, items: data.items.filter((i) => i.id !== id) })),
  });
}

export interface BalanceUpdate {
  id: string;
  balance: number;
}

export interface CheckIn {
  goals: BalanceUpdate[];
  debts: BalanceUpdate[];
  accounts: BalanceUpdate[];
  items: BalanceUpdate[];
}

/** Saves the confirmed balances and this month's net-worth snapshot together. */
export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkIn: CheckIn) => api.post<NetWorthData>('/networth/check-in', checkIn),
    onSuccess: (data) => {
      queryClient.setQueryData(netWorthQueryKey, data);
      // The balances live with their own modules; fetch the new ones.
      for (const queryKey of [savingsQueryKey, debtsQueryKey, investmentsQueryKey]) queryClient.invalidateQueries({ queryKey });
    },
  });
}

/** Emails the signed-in user a copy of their latest check-in recap, at their own address only. */
export function useEmailReport() {
  return useMutation({
    mutationFn: (projection: { debtFreeMonth: number | null; netWorthIn10Years: number | null }) => api.post('/networth/report/email', projection),
  });
}
