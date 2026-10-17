import { formatMoney } from './money';
import { firstMonthNetWorthReaches, type ProjectionResult } from './projection';

/**
 * The money timeline: the dated milestones a plan is heading for, read from a finished projection.
 * Pure: the same projection always gives the same roadmap.
 */

export type TimelineKind = 'debt-free' | 'debt' | 'goal' | 'net-worth';

export interface TimelineItem {
  key: string;
  kind: TimelineKind;
  label: string;
  /** Months from now. 0 means already reached; null means not within the projection. */
  month: number | null;
  /** Position in the debt or goal list the projection was run with, for linking back to it. */
  index?: number;
}

/** Net-worth steps worth celebrating, smallest first. */
export const NET_WORTH_STEPS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000];

/** How many not-yet-reached net-worth steps go on the roadmap. */
const NET_WORTH_ON_ROADMAP = 3;

/** A milestone this many months away or fewer counts as "nearing". */
export const NEAR_MONTHS = 3;

const kindOrder: Record<TimelineKind, number> = { debt: 0, 'debt-free': 1, goal: 2, 'net-worth': 3 };

export interface TimelineNames {
  debts: string[];
  goals: string[];
  /** Per debt, in the same order: true for a minimum-only debt (a mortgage), which "Debt-free" leaves out. */
  minimumOnly?: boolean[];
}

/**
 * Builds the roadmap:
 * - each debt's payoff, then "Debt-free" for the last one (a single debt is just "Debt-free"); a minimum-only
 *   debt still open at that point is named: "Debt-free (except Mortgage)";
 * - each savings goal, including ones already full and ones that never fill;
 * - the next few net-worth steps that haven't been reached yet and are reached within the projection.
 * Earliest first, with anything that never happens at the end.
 */
export function buildTimeline(result: ProjectionResult, names: TimelineNames): TimelineItem[] {
  const items: TimelineItem[] = [];

  const hadDebt = result.debtPayoffMonths.some((month) => month !== 0);
  if (hadDebt) {
    if (names.debts.length > 1) {
      result.debtPayoffMonths.forEach((month, index) => {
        // The last debt to go is the "Debt-free" milestone itself, so it isn't listed twice.
        if (month === null || month === 0 || month === result.debtFreeMonth) return;
        items.push({ key: `debt-${index}`, kind: 'debt', label: `${names.debts[index]} paid off`, month, index });
      });
    }
    const stillOpen = debtFreeExcept(result, names);
    const label = stillOpen.length > 0 ? `Debt-free (except ${stillOpen.join(', ')})` : 'Debt-free';
    items.push({ key: 'debt-free', kind: 'debt-free', label, month: result.debtFreeMonth });
  }

  result.goalFullMonths.forEach((month, index) => {
    items.push({ key: `goal-${index}`, kind: 'goal', label: `${names.goals[index]} reached`, month, index });
  });

  let added = 0;
  for (const amount of NET_WORTH_STEPS) {
    if (added >= NET_WORTH_ON_ROADMAP) break;
    const month = firstMonthNetWorthReaches(result, amount);
    // Already reached today, or too far away to be a date worth showing.
    if (month === 0 || month === null) continue;
    items.push({ key: `net-worth-${amount}`, kind: 'net-worth', label: `${formatMoney(amount)} net worth`, month });
    added++;
  }

  return items.sort(
    (a, b) => (a.month ?? Infinity) - (b.month ?? Infinity) || kindOrder[a.kind] - kindOrder[b.kind] || a.key.localeCompare(b.key),
  );
}

/** The minimum-only debts (a mortgage) still open when "debt-free" arrives, by name. Empty when there are none. */
export function debtFreeExcept(result: ProjectionResult, names: TimelineNames): string[] {
  return names.debts.filter((_, index) => {
    if (!names.minimumOnly?.[index]) return false;
    const payoff = result.debtPayoffMonths[index];
    return payoff === null || payoff > (result.debtFreeMonth ?? Infinity);
  });
}

/** Already reached today. */
export const isDone = (item: TimelineItem): boolean => item.month === 0;

/** Coming up within the next few months. */
export const isNear = (item: TimelineItem): boolean => item.month !== null && item.month >= 1 && item.month <= NEAR_MONTHS;

/** The first milestone that hasn't happened yet and does happen, if any. */
export function nextUp(items: TimelineItem[]): TimelineItem | null {
  return items.find((item) => item.month !== null && item.month >= 1) ?? null;
}
