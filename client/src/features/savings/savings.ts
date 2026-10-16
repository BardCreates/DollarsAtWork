import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { monthlyNeededForGoal, project, type ProjectionInput, type ProjectionResult, type SavingsSplitMode as EngineSplitMode } from '../../lib/projection';

export type SavingsSplitMode = 'Priority' | 'Percent';

export const splitModeInfo: Record<SavingsSplitMode, { label: string; description: string }> = {
  Priority: { label: 'Priority', description: 'Fill goals from the top down. Drag to change the order. A finished goal passes its money to the next one.' },
  Percent: { label: 'Percent', description: 'Each goal gets a fixed share of your monthly savings. A finished goal passes its share to the others.' },
};

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentBalance: number;
  /** "2027-06-01", or null for no deadline. */
  targetDate: string | null;
  apy: number;
  priority: number;
  sharePercent: number;
}

export interface SavingsData {
  splitMode: SavingsSplitMode;
  /** The plan's Savings category amount. Edited in Plan, never here. */
  monthlyAmount: number;
  /** Total of the plan's custom categories: what a month of living costs. */
  plannedExpenses: number;
  goals: Goal[];
}

export type GoalFields = Omit<Goal, 'id' | 'priority'>;

export const savingsQueryKey = ['savings'] as const;

export function useSavings() {
  return useQuery({ queryKey: savingsQueryKey, queryFn: () => api.get<SavingsData>('/savings') });
}

function useSavingsCache() {
  const queryClient = useQueryClient();
  const change = (update: (data: SavingsData) => SavingsData) =>
    queryClient.setQueryData<SavingsData>(savingsQueryKey, (data) => (data ? update(data) : data));
  return {
    change,
    changeNow: async (update: (data: SavingsData) => SavingsData) => {
      await queryClient.cancelQueries({ queryKey: savingsQueryKey });
      change(update);
    },
    reload: () => queryClient.invalidateQueries({ queryKey: savingsQueryKey }),
  };
}

export function useAddGoal() {
  const cache = useSavingsCache();
  return useMutation({
    mutationFn: (goal: GoalFields) => api.post<Goal>('/savings/goals', goal),
    onSuccess: (goal) => cache.change((data) => ({ ...data, goals: [...data.goals, goal] })),
  });
}

export function useSaveGoal() {
  const cache = useSavingsCache();
  return useMutation({
    mutationFn: ({ id, goal }: { id: string; goal: GoalFields }) => api.put<Goal>(`/savings/goals/${id}`, goal),
    onSuccess: (goal) => cache.change((data) => ({ ...data, goals: data.goals.map((g) => (g.id === goal.id ? goal : g)) })),
  });
}

export function useDeleteGoal() {
  const cache = useSavingsCache();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/savings/goals/${id}`),
    onSuccess: (_, id) => cache.change((data) => ({ ...data, goals: data.goals.filter((g) => g.id !== id) })),
  });
}

export function useReorderGoals() {
  const cache = useSavingsCache();
  return useMutation({
    mutationFn: (ids: string[]) => api.put('/savings/goals/order', { ids }),
    onMutate: (ids) =>
      cache.changeNow((data) => {
        const byId = new Map(data.goals.map((g) => [g.id, g]));
        return { ...data, goals: ids.flatMap((id, index) => (byId.has(id) ? [{ ...byId.get(id)!, priority: index }] : [])) };
      }),
    onError: cache.reload,
  });
}

export function useSetSplitMode() {
  const cache = useSavingsCache();
  return useMutation({
    mutationFn: (splitMode: SavingsSplitMode) => api.put('/savings/split-mode', { splitMode }),
    onMutate: (splitMode) => cache.changeNow((data) => ({ ...data, splitMode })),
    onError: cache.reload,
  });
}

/** The furthest the projection looks ahead: 40 years. */
export const SAVINGS_HORIZON_MONTHS = 480;

/** Whole months from this month to the month of a date. Negative when it has passed. */
export function monthsUntil(isoDate: string, from: Date = new Date()): number {
  const [year, month] = isoDate.split('-').map(Number);
  return (year - from.getFullYear()) * 12 + (month - 1 - from.getMonth());
}

export interface GoalOutlook {
  /** What the goal receives next month. */
  monthlyNow: number;
  /** Months until the balance reaches the target; 0 when already there, null when not within 40 years. */
  fullMonth: number | null;
  /** Only for goals with a target date. */
  deadline?: { months: number; onTrack: boolean; extraNeeded: number };
}

export interface SavingsProjection {
  result: ProjectionResult;
  outlooks: GoalOutlook[];
  totalSaved: number;
  totalTarget: number;
  /** The month every goal is full, or null. */
  allFullMonth: number | null;
  /** The shares of unfinished goals don't add up to 100 (Percent mode only). */
  sharesTotal: number;
}

/**
 * Runs the shared projection engine. `whole` is the dashboard's input for the whole plan (built with this
 * page's goals), so goal dates here match the dashboard's: money freed by paid-off debts can reach the goals
 * there, and must here too. Without it (the rest of the plan failed to load) the goals are projected alone.
 */
export function useSavingsProjection(data: SavingsData, whole?: ProjectionInput): SavingsProjection {
  return useMemo(() => {
    const goals = data.goals.map((g) => ({ id: g.id, target: g.targetAmount, balance: g.currentBalance, apy: g.apy, sharePercent: g.sharePercent }));
    const result = whole ? project({ ...whole, months: SAVINGS_HORIZON_MONTHS, todaysDollars: false }) : project({
      months: SAVINGS_HORIZON_MONTHS,
      monthlyIncome: 0,
      savingsMonthly: data.monthlyAmount,
      debtMonthly: 0,
      investmentsMonthly: 0,
      goals,
      savingsSplitMode: data.splitMode.toLowerCase() as EngineSplitMode,
      debts: [],
      accounts: [],
      // Fallback only (the rest of the plan failed to load): the goals alone.
      savingsDoneDestination: 'remaining',
    });

    const outlooks = data.goals.map((goal, i): GoalOutlook => {
      const monthlyNow = result.points[1]?.goalDeposits[i] ?? 0;
      const fullMonth = result.goalFullMonths[i];
      if (!goal.targetDate) return { monthlyNow, fullMonth };

      const months = monthsUntil(goal.targetDate);
      const onTrack = fullMonth !== null && fullMonth <= Math.max(0, months);
      const needed = monthlyNeededForGoal(goals[i], months);
      return { monthlyNow, fullMonth, deadline: { months, onTrack, extraNeeded: onTrack ? 0 : Math.max(0, needed - monthlyNow) } };
    });

    const fullMonths = result.goalFullMonths;
    return {
      result,
      outlooks,
      totalSaved: data.goals.reduce((sum, g) => sum + g.currentBalance, 0),
      totalTarget: data.goals.reduce((sum, g) => sum + g.targetAmount, 0),
      allFullMonth: fullMonths.every((m) => m !== null) ? Math.max(0, ...(fullMonths as number[])) : null,
      sharesTotal: data.goals.filter((g) => g.currentBalance < g.targetAmount).reduce((sum, g) => sum + g.sharePercent, 0),
    };
  }, [data, whole]);
}
