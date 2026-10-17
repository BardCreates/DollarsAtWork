import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { localToday, monthsUntilYearMonth } from '../../lib/dates';
import type { WindfallInput } from '../../lib/projection';
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
  /** True: each raise is added to the Investments amount. False: it lands in Remaining and isn't projected. */
  raiseToInvestments: boolean;
}

export interface OtherItem {
  id: string;
  name: string;
  kind: OtherItemKind;
  type: OtherItemType;
  value: number;
  /** How the value moves each year, as a percent: 3 gains 3% a year, −10 loses 10%. 0 keeps it flat. */
  yearlyChangePercent: number;
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

export type WindfallDestination = 'Debt' | 'Savings' | 'Investments';

export const windfallDestinationLabels: Record<WindfallDestination, string> = {
  Debt: 'Pay down debt',
  Savings: 'Savings goals',
  Investments: 'Investments',
};

/** One-time money expected in a month: a tax refund, a bonus, something sold. */
export interface Windfall {
  id: string;
  name: string;
  amount: number;
  /** "2027-03": the month it arrives. */
  month: string;
  destination: WindfallDestination;
}

export type WindfallFields = Omit<Windfall, 'id'>;

export interface NetWorthData {
  settings: Settings;
  items: OtherItem[];
  snapshots: Snapshot[];
  windfalls: Windfall[];
}

/**
 * Windfalls as the engine takes them: one landing this month counts in month 1 (the next step of the projection),
 * and one whose month has gone by is left out.
 */
export function toWindfallInputs(windfalls: Windfall[], from: Date = new Date()): WindfallInput[] {
  return windfalls.flatMap((w) => {
    const months = monthsUntilYearMonth(w.month, from);
    if (months === null || months < 0) return [];
    return [{ id: w.id, month: Math.max(1, months), amount: w.amount, destination: w.destination.toLowerCase() as WindfallInput['destination'] }];
  });
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

export function useAddWindfall() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: (windfall: WindfallFields) => api.post<Windfall>('/networth/windfalls', windfall),
    onSuccess: (windfall) => change((data) => ({ ...data, windfalls: sortWindfalls([...data.windfalls, windfall]) })),
  });
}

export function useSaveWindfall() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: ({ id, windfall }: { id: string; windfall: WindfallFields }) => api.put<Windfall>(`/networth/windfalls/${id}`, windfall),
    onSuccess: (windfall) => change((data) => ({ ...data, windfalls: sortWindfalls(data.windfalls.map((w) => (w.id === windfall.id ? windfall : w))) })),
  });
}

export function useDeleteWindfall() {
  const change = useNetWorthCache();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/networth/windfalls/${id}`),
    onSuccess: (_, id) => change((data) => ({ ...data, windfalls: data.windfalls.filter((w) => w.id !== id) })),
  });
}

/** Soonest first, as the server lists them. "2027-03" sorts as text. */
const sortWindfalls = (windfalls: Windfall[]) => [...windfalls].sort((a, b) => a.month.localeCompare(b.month));

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
    // today: this browser's own date, so a late-evening check-in on the 31st counts for this month, not UTC's next one.
    mutationFn: (checkIn: CheckIn) => api.post<NetWorthData>('/networth/check-in', { ...checkIn, today: localToday() }),
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
    mutationFn: (projection: { debtFreeMonth: number | null; debtFreeOn: string | null; netWorthIn10Years: number | null }) => api.post('/networth/report/email', projection),
  });
}
