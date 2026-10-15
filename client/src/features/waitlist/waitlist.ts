import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';

/** Which page a waitlist address came from. Must match the list in WaitlistEndpoints. */
export type WaitlistSource = 'home' | 'tools' | 'demo' | 'pricing' | 'help' | 'blog';

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: (values: { email: string; source: WaitlistSource }) => api.post('/waitlist', values),
  });
}
