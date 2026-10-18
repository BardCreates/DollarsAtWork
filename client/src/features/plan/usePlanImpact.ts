import { useMemo } from 'react';
import { comparePlans, planExpectedReturn, type PlanImpact } from '../../lib/planImpact';
import { project } from '../../lib/projection';
import { buildProjectionInput, useDashboardData } from '../dashboard/useDashboard';
import type { Plan } from './plan';

export type PlanImpactState =
  | { status: 'loading' | 'unavailable' }
  | {
      status: 'ready';
      impact: PlanImpact;
      /** The yearly return "if invested" figures use: the plan's own, from its investment accounts. */
      expectedReturn: number;
      /** False when it is the default, because no investment accounts have been added. */
      hasAccounts: boolean;
    };

/** True when two versions of the plan would project differently: income or any category amount differs. */
export function plansDiffer(a: Plan, b: Plan): boolean {
  if (a.monthlyIncome !== b.monthlyIncome) return true;
  const amounts = new Map(a.categories.map((c) => [c.id, c.amount]));
  if (amounts.size !== b.categories.length) return true;
  return b.categories.some((c) => amounts.get(c.id) !== c.amount);
}

/**
 * "Move a dollar": projects the plan as it was (baseline) and as it is being typed (live), with the same
 * debts, goals, accounts and assumptions as the dashboard, and compares them. Runs in the browser on
 * every keystroke; nothing is saved or sent.
 */
export function usePlanImpact(baseline: Plan, live: Plan): PlanImpactState {
  const { data, isPending } = useDashboardData();

  return useMemo(() => {
    if (!data) return { status: isPending ? 'loading' : 'unavailable' };
    // Today's dollars, like the dashboard's default, so the two show the same 10-year number.
    const run = (plan: Plan) => project(buildProjectionInput({ ...data, plan }, true));
    return {
      status: 'ready',
      impact: comparePlans(run(baseline), run(live)),
      expectedReturn: planExpectedReturn(data.investments.accounts),
      hasAccounts: data.investments.accounts.length > 0,
    };
  }, [data, isPending, baseline, live]);
}
