import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export type CategoryKind = 'Custom' | 'Savings' | 'Debt' | 'Investment';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  amount: number;
  sortOrder: number;
  color: string;
  isBuiltIn: boolean;
}

export interface Plan {
  monthlyIncome: number;
  currency: string;
  categories: Category[];
}

/** Where each built-in category's money is put to work. */
export const moduleLinks: Record<Exclude<CategoryKind, 'Custom'>, { to: string; label: string }> = {
  Savings: { to: '/savings', label: 'Go to Savings' },
  Debt: { to: '/debt', label: 'Go to Debt' },
  Investment: { to: '/invest', label: 'Go to Invest' },
};

export const planQueryKey = ['plan'] as const;
/** Every plan change shares this key, so the page can show one "Saving…" state. */
export const planMutationKey = ['plan', 'save'] as const;

export function usePlan() {
  return useQuery({
    queryKey: planQueryKey,
    queryFn: () => api.get<Plan>('/plan'),
  });
}

/** Remaining = income − everything allocated. Negative means over-allocated. */
export function planTotals(plan: Plan) {
  const allocated = plan.categories.reduce((sum, c) => sum + c.amount, 0);
  return { allocated, remaining: plan.monthlyIncome - allocated };
}

/**
 * Shared plumbing for plan changes: show the change at once, save in the background,
 * and reload the real plan if a save fails. Saves run one at a time, in order.
 */
function usePlanCache() {
  const queryClient = useQueryClient();
  const change = (update: (plan: Plan) => Plan) =>
    queryClient.setQueryData<Plan>(planQueryKey, (plan) => (plan ? update(plan) : plan));

  return {
    /** Apply a change to the cached plan right away. */
    changeNow: async (update: (plan: Plan) => Plan) => {
      await queryClient.cancelQueries({ queryKey: planQueryKey });
      change(update);
    },
    replace: (plan: Plan) => queryClient.setQueryData<Plan>(planQueryKey, plan),
    reload: () => queryClient.invalidateQueries({ queryKey: planQueryKey }),
  };
}

const saveOptions = { mutationKey: planMutationKey, scope: { id: 'plan' } } as const;

export function useUpdateIncome() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: (monthlyIncome: number) => api.put<Plan>('/plan/income', { monthlyIncome }),
    onMutate: (monthlyIncome) => cache.changeNow((plan) => ({ ...plan, monthlyIncome })),
    onError: cache.reload,
  });
}

/** Rescales every category from the previous income to the current one. */
export function useScaleCategories() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: (fromIncome: number) => api.post<Plan>('/plan/scale', { fromIncome }),
    onSuccess: cache.replace,
    onError: cache.reload,
  });
}

export interface NewCategory {
  name: string;
  amount: number;
  color: string;
  /** Row to insert at; left out means the end of the list. */
  position?: number;
}

export function useAddCategory() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: (category: NewCategory) => api.post<Plan>('/plan/categories', category),
    onSuccess: cache.replace,
  });
}

export type CategoryChanges = Partial<Pick<Category, 'name' | 'amount' | 'color'>>;

export function useUpdateCategory() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: ({ id, changes }: { id: string; changes: CategoryChanges }) =>
      api.patch<Category>(`/plan/categories/${id}`, changes),
    onMutate: ({ id, changes }) =>
      cache.changeNow((plan) => ({
        ...plan,
        categories: plan.categories.map((c) => (c.id === id ? { ...c, ...changes } : c)),
      })),
    onError: cache.reload,
  });
}

/**
 * Changes a built-in category's amount from its own page (Savings, Debt, Invest). Writes to the plan, the one place
 * the amount lives, then reloads the module so its banner and projection pick the new amount up.
 */
export function useSetModuleAmount(kind: Exclude<CategoryKind, 'Custom'>) {
  const update = useUpdateCategory();
  const queryClient = useQueryClient();
  const { data: plan } = usePlan();
  const category = plan?.categories.find((c) => c.kind === kind);
  return {
    category,
    isPending: update.isPending,
    set: (amount: number) => {
      if (!category) return;
      update.mutate(
        { id: category.id, changes: { amount } },
        { onSettled: () => queryClient.invalidateQueries({ queryKey: moduleQueryKeys[kind] }) },
      );
    },
  };
}

/** The module query each built-in category feeds; its monthly amount comes back from that endpoint. */
const moduleQueryKeys: Record<Exclude<CategoryKind, 'Custom'>, readonly string[]> = {
  Savings: ['savings'],
  Debt: ['debts'],
  Investment: ['investments'],
};

export function useDeleteCategory() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: (id: string) => api.delete(`/plan/categories/${id}`),
    onMutate: (id) => cache.changeNow((plan) => ({ ...plan, categories: plan.categories.filter((c) => c.id !== id) })),
    onError: cache.reload,
  });
}

export function useReorderCategories() {
  const cache = usePlanCache();
  return useMutation({
    ...saveOptions,
    mutationFn: (ids: string[]) => api.put('/plan/categories/order', { ids }),
    onMutate: (ids) =>
      cache.changeNow((plan) => {
        const byId = new Map(plan.categories.map((c) => [c.id, c]));
        const ordered = ids.flatMap((id, index) => {
          const category = byId.get(id);
          return category ? [{ ...category, sortOrder: index }] : [];
        });
        return { ...plan, categories: ordered };
      }),
    onError: cache.reload,
  });
}
