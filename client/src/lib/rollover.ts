import type { FreedMoneyDestination, ProjectionResult } from './projection';

/**
 * "Freed money rolls forward": when a debt is paid off or a goal is full, where its money goes next.
 * Read straight from a finished projection, so the message can never disagree with the numbers.
 */

/** Anything under half a cent is nothing. */
const DUST = 0.005;

export type RolloverTarget =
  /** Other debts or goals, by their position in the list the projection was run with. */
  | { kind: 'items'; indexes: number[] }
  /** Nothing is left to receive it, so it goes to the user's chosen destination. */
  | { kind: 'destination'; destination: FreedMoneyDestination };

export interface Rollover {
  /** The debt or goal that finishes, by position in the list. */
  index: number;
  /** Months from now it finishes (1 or more). */
  month: number;
  /** What it was receiving each month just before; null when it finishes next month and there is no full month to read. */
  amount: number | null;
  target: RolloverTarget;
}

/**
 * For every debt that gets paid off, who receives its payment. The receiver is the open debt being paid
 * above its minimum in the payoff month (or the month after, if that month's payment used up the budget).
 * With no debts left in the payoff order (a minimum-only mortgage doesn't count), it goes to `destination`.
 * Debts that are never paid off, or have nobody to pass money to (the budget only covers minimums), are left out.
 */
export function debtRollovers(
  result: ProjectionResult,
  minPayments: number[],
  destination: FreedMoneyDestination,
  minimumOnly: boolean[] = [],
): Rollover[] {
  const rollovers: Rollover[] = [];

  result.debtPayoffMonths.forEach((month, index) => {
    if (month === null || month < 1) return;

    const amount = month >= 2 ? result.points[month - 1].debtPayments[index] : null;
    if (amount !== null && amount < DUST) return;

    const open = result.debtPayoffMonths.flatMap((m, j) => ((m === null || m > month) && !minimumOnly[j] ? [j] : []));
    if (open.length === 0) {
      rollovers.push({ index, month, amount, target: { kind: 'destination', destination } });
      return;
    }

    for (const at of [month, month + 1]) {
      const point = result.points[at];
      if (!point) continue;
      let best = -1;
      let bestExtra = DUST;
      for (const j of open) {
        const extra = point.debtPayments[j] - minPayments[j];
        if (extra > bestExtra) {
          best = j;
          bestExtra = extra;
        }
      }
      if (best >= 0) {
        rollovers.push({ index, month, amount, target: { kind: 'items', indexes: [best] } });
        return;
      }
    }
  });

  return rollovers;
}

/**
 * For every goal that fills up, who receives its monthly amount: the next goal down the list in priority
 * mode, or every goal still open in percent mode. With none left it goes to `destination`.
 * Goals that were already full today, or that fill from interest alone, are left out.
 */
export function goalRollovers(result: ProjectionResult, mode: 'priority' | 'percent', destination: FreedMoneyDestination): Rollover[] {
  const rollovers: Rollover[] = [];

  result.goalFullMonths.forEach((month, index) => {
    if (month === null || month < 1) return;

    const amount = month >= 2 ? result.points[month - 1].goalDeposits[index] : null;
    if (amount !== null && amount < DUST) return;

    const open = result.goalFullMonths.flatMap((m, j) => (m === null || m > month ? [j] : []));
    if (open.length === 0) {
      rollovers.push({ index, month, amount, target: { kind: 'destination', destination } });
    } else {
      rollovers.push({ index, month, amount, target: { kind: 'items', indexes: mode === 'priority' ? [open[0]] : open } });
    }
  });

  return rollovers;
}
