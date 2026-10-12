import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { meQueryKey } from '../../auth/auth';

export function useChangePassword() {
  return useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) => api.post('/account/change-password', values),
  });
}

/** Sends a confirmation link to the new address. The email only changes when that link is opened. */
export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (values: { newEmail: string; currentPassword: string }) => api.post('/account/change-email', values),
  });
}

export function useConfirmEmailChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { userId: string; email: string; token: string }) => api.post('/account/confirm-email-change', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post('/account/delete', { password }),
    onSuccess: () => {
      // Nothing from the deleted account may linger in memory.
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}

/** Downloads are plain links: the browser sends the sign-in cookie and saves the file itself. */
export const exportLinks = {
  json: '/api/account/export?format=json',
  csv: '/api/account/export?format=csv',
} as const;
