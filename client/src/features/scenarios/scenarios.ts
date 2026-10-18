import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { project } from '../../lib/projection';
import { resolveScenario, summarizeProjection, type ScenarioChanges, type ScenarioInputs, type ScenarioMetrics } from '../../lib/scenarios';
import type { DebtStrategy } from '../debt/debts';
import type { Destination } from '../dashboard/networth';
import { buildProjectionInput, DASHBOARD_YEARS, type DashboardData } from '../dashboard/useDashboard';

export const MAX_SCENARIOS = 3;

export interface Scenario {
  id: string;
  name: string;
  sortOrder: number;
  overrides: ScenarioChanges;
}

export interface SaveScenario {
  name: string;
  overrides: ScenarioChanges;
}

export const scenariosQueryKey = ['scenarios'] as const;

export function useScenarios() {
  return useQuery({ queryKey: scenariosQueryKey, queryFn: () => api.get<Scenario[]>('/scenarios') });
}

function useScenariosCache() {
  const queryClient = useQueryClient();
  return (update: (scenarios: Scenario[]) => Scenario[]) =>
    queryClient.setQueryData<Scenario[]>(scenariosQueryKey, (scenarios) => update(scenarios ?? []));
}

export function useAddScenario() {
  const change = useScenariosCache();
  return useMutation({
    mutationFn: (scenario: SaveScenario) => api.post<Scenario>('/scenarios', scenario),
    onSuccess: (scenario) => change((scenarios) => [...scenarios, scenario]),
  });
}

export function useSaveScenario() {
  const change = useScenariosCache();
  return useMutation({
    mutationFn: ({ id, scenario }: { id: string; scenario: SaveScenario }) => api.put<Scenario>(`/scenarios/${id}`, scenario),
    onSuccess: (scenario) => change((scenarios) => scenarios.map((s) => (s.id === scenario.id ? scenario : s))),
  });
}

export function useDeleteScenario() {
  const change = useScenariosCache();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scenarios/${id}`),
    onSuccess: (_, id) => change((scenarios) => scenarios.filter((s) => s.id !== id)),
  });
}

/** The real plan as the values a scenario can change. */
export function baseInputs(data: DashboardData): ScenarioInputs {
  return {
    monthlyIncome: data.plan.monthlyIncome,
    categoryAmounts: Object.fromEntries(data.plan.categories.map((c) => [c.id, c.amount])),
    incomeGrowthRate: data.netWorth.settings.incomeGrowthRate,
    debtStrategy: data.debts.strategy,
    debtDoneDestination: data.netWorth.settings.debtDoneDestination,
    savingsDoneDestination: data.netWorth.settings.savingsDoneDestination,
  };
}

/** The same data with a scenario's values laid over the plan's. The saved plan is never touched. */
export function withInputs(data: DashboardData, inputs: ScenarioInputs): DashboardData {
  return {
    ...data,
    plan: {
      ...data.plan,
      monthlyIncome: inputs.monthlyIncome,
      categories: data.plan.categories.map((c) => ({ ...c, amount: inputs.categoryAmounts[c.id] ?? c.amount })),
    },
    debts: { ...data.debts, strategy: inputs.debtStrategy as DebtStrategy },
    netWorth: {
      ...data.netWorth,
      settings: {
        ...data.netWorth.settings,
        incomeGrowthRate: inputs.incomeGrowthRate,
        debtDoneDestination: inputs.debtDoneDestination as Destination,
        savingsDoneDestination: inputs.savingsDoneDestination as Destination,
      },
    },
  };
}

export interface ComparedPlan {
  id: string;
  name: string;
  isCurrent: boolean;
  metrics: ScenarioMetrics;
  /** Net worth at the end of each year, from today (index 0) to 40 years. */
  netWorthByYear: number[];
}

/** Projects the real plan and every scenario with the same engine, debts, goals and accounts. */
export function useComparison(data: DashboardData, scenarios: Scenario[]): ComparedPlan[] {
  return useMemo(() => {
    const base = baseInputs(data);

    const run = (inputs: ScenarioInputs) => {
      // Today's dollars, the same as the dashboard shows by default (interest paid stays in actual dollars).
      const result = project(buildProjectionInput(withInputs(data, inputs), true));
      return {
        metrics: summarizeProjection(result),
        netWorthByYear: Array.from({ length: DASHBOARD_YEARS + 1 }, (_, year) => result.points[year * 12].netWorth),
      };
    };

    return [
      { id: 'plan', name: 'Current plan', isCurrent: true, ...run(base) },
      ...scenarios.map((scenario) => ({ id: scenario.id, name: scenario.name, isCurrent: false, ...run(resolveScenario(base, scenario.overrides)) })),
    ];
  }, [data, scenarios]);
}
