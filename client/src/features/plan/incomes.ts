import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { IncomeFrequency } from '../../lib/income';
import { planQueryKey, type Plan } from './plan';

export interface IncomeSource {
  id: string;
  name: string;
  /** Per paycheck (per month for Monthly and Varies, per year for Yearly). */
  amount: number;
  frequency: IncomeFrequency;
  /** What it comes to in an average month, to the cent. */
  monthlyAmount: number;
  sortOrder: number;
}

export interface IncomesData {
  /** The plan's monthly income: the sources' total while there are any. */
  monthlyIncome: number;
  sources: IncomeSource[];
}

export type IncomeSourceFields = Pick<IncomeSource, 'name' | 'amount' | 'frequency'>;

export const incomesQueryKey = ['incomes'] as const;

export function useIncomes() {
  return useQuery({ queryKey: incomesQueryKey, queryFn: () => api.get<IncomesData>('/plan/incomes') });
}

/**
 * Every change answers with the sources and the new income. The plan's cached income follows at once; the module
 * pages that read income (the match cap on Invest) refresh.
 */
function useApply() {
  const queryClient = useQueryClient();
  return (data: IncomesData) => {
    queryClient.setQueryData<IncomesData>(incomesQueryKey, data);
    queryClient.setQueryData<Plan>(planQueryKey, (plan) => (plan ? { ...plan, monthlyIncome: data.monthlyIncome } : plan));
    queryClient.invalidateQueries({ queryKey: ['investments'] });
  };
}

export function useAddIncomeSource() {
  const apply = useApply();
  return useMutation({ mutationFn: (source: IncomeSourceFields) => api.post<IncomesData>('/plan/incomes', source), onSuccess: apply });
}

export function useSaveIncomeSource() {
  const apply = useApply();
  return useMutation({
    mutationFn: ({ id, source }: { id: string; source: IncomeSourceFields }) => api.put<IncomesData>(`/plan/incomes/${id}`, source),
    onSuccess: apply,
  });
}

export function useDeleteIncomeSource() {
  const apply = useApply();
  return useMutation({ mutationFn: (id: string) => api.delete<IncomesData>(`/plan/incomes/${id}`), onSuccess: apply });
}
