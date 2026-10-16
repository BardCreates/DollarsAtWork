import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export interface UsageCount {
  name: string;
  thisPeriod: number;
  previousPeriod: number;
}

export interface SourceCount {
  /** The page that sent the sign-up, or null when unknown. */
  source: string | null;
  count: number;
}

export interface UsageSummary {
  days: number;
  from: string;
  to: string;
  events: UsageCount[];
  signupSources: SourceCount[];
}

export const usageSummaryQueryKey = (days: number) => ['usage', 'summary', days] as const;

/** The owner's numbers for the last `days` days and the `days` before. Anyone else gets a 404. */
export function useUsageSummary(days: number) {
  return useQuery({
    queryKey: usageSummaryQueryKey(days),
    queryFn: () => api.get<UsageSummary>(`/usage/summary?days=${days}`),
    staleTime: 60_000,
    retry: false,
  });
}
