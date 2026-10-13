import type { ProjectionResult } from './projection';

/**
 * What-if scenarios: the real plan plus a few changes, and a few numbers to compare them by.
 * A scenario stores only what it changes, so everything else keeps following the real plan.
 * Pure functions; nothing here touches the saved plan.
 */

/** The things a scenario can change, in the form the server stores them. Anything left out is unchanged. */
export interface ScenarioChanges {
  monthlyIncome?: number | null;
  /** New monthly amounts, by category id. Categories not listed keep the plan's amount. */
  categoryAmounts?: Record<string, number> | null;
  incomeGrowthRate?: number | null;
  /** 'Snowball' | 'Avalanche' | 'Custom' */
  debtStrategy?: string | null;
  /** 'Investments' | 'Savings' | 'Debt' | 'Remaining' */
  debtDoneDestination?: string | null;
  savingsDoneDestination?: string | null;
}

/** Everything a scenario can change, with a value for each: the real plan, or a scenario laid over it. */
export interface ScenarioInputs {
  monthlyIncome: number;
  categoryAmounts: Record<string, number>;
  incomeGrowthRate: number;
  debtStrategy: string;
  debtDoneDestination: string;
  savingsDoneDestination: string;
}

/** Two money amounts closer than this are the same amount. */
const SAME = 0.005;

/** Lays a scenario's changes over the real plan. Changes to categories that no longer exist are ignored. */
export function resolveScenario(base: ScenarioInputs, changes: ScenarioChanges): ScenarioInputs {
  const categoryAmounts = { ...base.categoryAmounts };
  for (const [id, amount] of Object.entries(changes.categoryAmounts ?? {})) {
    if (id in categoryAmounts) categoryAmounts[id] = amount;
  }

  return {
    monthlyIncome: changes.monthlyIncome ?? base.monthlyIncome,
    categoryAmounts,
    incomeGrowthRate: changes.incomeGrowthRate ?? base.incomeGrowthRate,
    debtStrategy: changes.debtStrategy ?? base.debtStrategy,
    debtDoneDestination: changes.debtDoneDestination ?? base.debtDoneDestination,
    savingsDoneDestination: changes.savingsDoneDestination ?? base.savingsDoneDestination,
  };
}

/** The changes that turn `base` into `edited`: only what differs, so unchanged things keep following the plan. */
export function changesBetween(base: ScenarioInputs, edited: ScenarioInputs): ScenarioChanges {
  const changes: ScenarioChanges = {};

  if (Math.abs(edited.monthlyIncome - base.monthlyIncome) > SAME) changes.monthlyIncome = edited.monthlyIncome;

  const amounts: Record<string, number> = {};
  for (const [id, amount] of Object.entries(edited.categoryAmounts)) {
    if (id in base.categoryAmounts && Math.abs(amount - base.categoryAmounts[id]) > SAME) amounts[id] = amount;
  }
  if (Object.keys(amounts).length > 0) changes.categoryAmounts = amounts;

  if (Math.abs(edited.incomeGrowthRate - base.incomeGrowthRate) > 1e-9) changes.incomeGrowthRate = edited.incomeGrowthRate;
  if (edited.debtStrategy !== base.debtStrategy) changes.debtStrategy = edited.debtStrategy;
  if (edited.debtDoneDestination !== base.debtDoneDestination) changes.debtDoneDestination = edited.debtDoneDestination;
  if (edited.savingsDoneDestination !== base.savingsDoneDestination) changes.savingsDoneDestination = edited.savingsDoneDestination;

  return changes;
}

/** True when a scenario changes nothing, so it would just repeat the real plan. */
export function isEmptyChanges(changes: ScenarioChanges): boolean {
  return (
    changes.monthlyIncome == null &&
    Object.keys(changes.categoryAmounts ?? {}).length === 0 &&
    changes.incomeGrowthRate == null &&
    changes.debtStrategy == null &&
    changes.debtDoneDestination == null &&
    changes.savingsDoneDestination == null
  );
}

/** The years a scenario is compared at. */
export const COMPARE_YEARS = [10, 20, 30] as const;

export interface ScenarioMetrics {
  /** Months from now until the last debt is gone: 0 for no debt today, null if it isn't within the projection. */
  debtFreeMonth: number | null;
  /** True when there was any debt to pay off today. */
  hasDebt: boolean;
  /** Net worth at 10, 20 and 30 years, in that order. */
  netWorth: { years: number; value: number }[];
  /** Interest paid on all debts from now until they are gone. */
  interestPaid: number;
}

/** The handful of numbers scenarios are compared by, from one projection. */
export function summarizeProjection(result: ProjectionResult): ScenarioMetrics {
  const last = result.points.length - 1;
  return {
    debtFreeMonth: result.debtFreeMonth,
    hasDebt: result.debtPayoffMonths.some((month) => month !== 0),
    netWorth: COMPARE_YEARS.map((years) => ({ years, value: result.points[Math.min(years * 12, last)].netWorth })),
    interestPaid: result.totalInterest,
  };
}
