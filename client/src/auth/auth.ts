import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';

export type SubscriptionStatus = 'Trialing' | 'Active' | 'PastDue' | 'Canceled' | 'Expired';

export interface Access {
  status: SubscriptionStatus;
  hasFullAccess: boolean;
  trialEndsAt: string;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  /** 'month' or 'year' once subscribed. */
  billingInterval: string | null;
  /** True once the account has been to Stripe Checkout, so there is billing to manage. */
  hasBillingAccount: boolean;
}

/** First-time hint settings: all off, or the ids of the hints closed one by one. */
export interface HintSettings {
  off: boolean;
  dismissed: string[];
}

export interface Me {
  id: string;
  email: string;
  emailConfirmed: boolean;
  access: Access;
  hints: HintSettings;
  /** True for the account named in the server's App:OwnerEmail setting: the only one that can open /numbers. */
  isOwner: boolean;
}

export const meQueryKey = ['me'] as const;

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export interface Credentials {
  email: string;
  password: string;
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Credentials & { rememberMe?: boolean }) =>
      api.post<Me>('/auth/login', { ...values, rememberMe: values.rememberMe ?? true }),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Credentials & { source?: string }) => api.post<Me>('/auth/register', values),
    onSuccess: (me) => queryClient.setQueryData(meQueryKey, me),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      // Drop every cached answer so nothing from this account lingers.
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (values: { email: string; token: string; newPassword: string }) =>
      api.post('/auth/reset-password', values),
  });
}

export function useConfirmEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { userId: string; token: string }) => api.post('/auth/confirm-email', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useResendConfirmation() {
  return useMutation({
    mutationFn: () => api.post('/auth/resend-confirmation'),
  });
}
