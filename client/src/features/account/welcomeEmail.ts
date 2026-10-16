import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { meQueryKey, type Me } from '../../auth/auth';
import { outlookForEmail, type Outlook } from '../dashboard/useDashboard';

/**
 * Whether to send the hour-1 welcome email now: a signed-in person who hasn't had it yet, a projection to put in it,
 * and no attempt yet this session (one try is enough; the server also refuses a second send).
 */
export function shouldSendWelcome(me: Me | null | undefined, outlook: Outlook | null | undefined, alreadyTried: boolean): boolean {
  if (!me || me.welcomeEmailSent || alreadyTried) return false;
  return outlook != null;
}

/**
 * Sends the welcome email with the person's own numbers the first time the dashboard has a projection.
 * Fire-and-forget: a failure is not shown, because the hourly fallback email covers it.
 */
export function useSendWelcomeEmail(me: Me | null | undefined, outlook: Outlook | null | undefined) {
  const queryClient = useQueryClient();
  const tried = useRef(false);
  const send = useMutation({
    mutationFn: (values: { debtFreeMonth: number | null; netWorthIn10Years: number }) => api.post('/account/welcome-email', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });

  // mutate is stable across renders, so only the inputs decide when this runs.
  const { mutate } = send;
  useEffect(() => {
    if (!shouldSendWelcome(me, outlook, tried.current) || !outlook) return;
    tried.current = true;
    mutate(outlookForEmail(outlook));
  }, [me, outlook, mutate]);
}
