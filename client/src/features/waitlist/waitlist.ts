import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';

/** Which page a waitlist address came from. Must match the list in WaitlistEndpoints. */
export type WaitlistSource = 'home' | 'tools' | 'demo' | 'pricing' | 'help' | 'blog' | 'affiliates';

/** The most the server keeps of a note (WaitlistEndpoints.MaxNoteLength). */
export const MAX_WAITLIST_NOTE = 200;

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: (values: { email: string; source: WaitlistSource; note?: string }) => api.post('/waitlist', values),
  });
}

/** What the affiliates form stores with the address: "Sam Lee — YouTube, 60K", trimmed to fit. */
export function affiliateNote(name: string, where: string): string {
  const note = [name.trim(), where.trim()].filter(Boolean).join(' — ');
  return note.length > MAX_WAITLIST_NOTE ? note.slice(0, MAX_WAITLIST_NOTE - 1).trimEnd() + '…' : note;
}
