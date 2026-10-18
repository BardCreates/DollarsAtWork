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
  /**
   * What it was receiving each month just before, read from the last month before it finishes that had no one-time
   * money in it (a windfall would make one month's payment look like a monthly amount). Null when there is no such
   * month to read (it finishes next month, say).
   */
  amount: number | null;
  target: RolloverTarget;
  /** A sinking fund: its money only moves until the next bill is due, then the fund takes it back. */
  untilDue?: boolean;
}

/** The latest month before `month` (from 1) not in `skip`, or null. */
function steadyMonth(month: number, skip: ReadonlySet<number>): number | null {
  for (let m = month - 1; m >= 1; m--) if (!skip.has(m)) return m;
  return null;
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
  windfallMonths: number[] = [],
): Rollover[] {
  const rollovers: Rollover[] = [];
  const skip = new Set(windfallMonths);

  result.debtPayoffMonths.forEach((month, index) => {
    if (month === null || month < 1) return;

    const read = steadyMonth(month, skip);
    const amount = read === null ? null : result.points[read].debtPayments[index];
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
 * Goals that were already full today, or that fill from interest alone, are left out. A sinking fund
 * (`repeating`) is marked `untilDue`: it takes its money back when the bill comes due.
 */
export function goalRollovers(
  result: ProjectionResult,
  mode: 'priority' | 'percent',
  destination: FreedMoneyDestination,
  windfallMonths: number[] = [],
  repeating: boolean[] = [],
): Rollover[] {
  const rollovers: Rollover[] = [];
  const skip = new Set(windfallMonths);

  result.goalFullMonths.forEach((month, index) => {
    if (month === null || month < 1) return;

    const read = steadyMonth(month, skip);
    const amount = read === null ? null : result.points[read].goalDeposits[index];
    if (amount !== null && amount < DUST) return;

    // A sinking fund that fills in a due month pays the bill straight away and keeps taking its money: nothing moves.
    if (repeating[index] && amount !== null && (result.points[month + 1]?.goalDeposits[index] ?? 0) >= amount - DUST) return;

    const open = result.goalFullMonths.flatMap((m, j) => (m === null || m > month ? [j] : []));
    const untilDue = repeating[index] ? { untilDue: true } : {};
    if (open.length === 0) {
      rollovers.push({ index, month, amount, target: { kind: 'destination', destination }, ...untilDue });
    } else {
      rollovers.push({ index, month, amount, target: { kind: 'items', indexes: mode === 'priority' ? [open[0]] : open }, ...untilDue });
    }
  });

  return rollovers;
}
