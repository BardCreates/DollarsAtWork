import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { meQueryKey, type Access, type Me } from '../../auth/auth';

export type BillingInterval = 'month' | 'year';

/** What someone can subscribe to. Founding is the limited $49-a-year offer, while spots last. */
export type BillingPlan = 'monthly' | 'annual' | 'founding';

export interface Price {
  amount: number;
  currency: string;
}

export interface Prices {
  /** False when Stripe isn't set up on this server. */
  enabled: boolean;
  monthly: Price | null;
  annual: Price | null;
  /** The founding offer, when there is one: its price and how many of its spots are taken. */
  founding?: { price: Price; taken: number; limit: number; open: boolean } | null;
}

export const pricesQueryKey = ['billing', 'prices'] as const;

export function usePrices() {
  return useQuery({ queryKey: pricesQueryKey, queryFn: () => api.get<Prices>('/billing/prices'), staleTime: 10 * 60_000 });
}

/** Both of these hand the browser over to a page on Stripe. */
const leaveFor = ({ url }: { url: string }) => window.location.assign(url);

export function useStartCheckout() {
  return useMutation({
    mutationFn: (plan: BillingPlan) => api.post<{ url: string }>('/billing/checkout', { plan }),
    onSuccess: leaveFor,
  });
}

export function useOpenPortal() {
  return useMutation({
    mutationFn: () => api.post<{ url: string }>('/billing/portal'),
    onSuccess: leaveFor,
  });
}

/** After coming back from Stripe: fetch the subscription's real state now, without waiting for the webhook. */
export function useSyncBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Access>('/billing/sync'),
    onSuccess: (access) => queryClient.setQueryData<Me | null>(meQueryKey, (me) => (me ? { ...me, access } : me)),
  });
}
