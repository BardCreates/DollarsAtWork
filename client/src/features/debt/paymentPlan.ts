import type { ProjectionResult } from '../../lib/projection';

/** Less than half a cent: treat as equal. */
const CENT = 0.005;

/**
 * How one debt's payment in a month compares with its minimum:
 * - minimum: exactly the minimum
 * - extra: the minimum plus extra money (the debt the plan is focused on, or a one-time amount)
 * - last: the payment that clears the balance (may be less than the minimum)
 * - short: less than the minimum and the debt isn't cleared, because the Debt amount doesn't cover every minimum
 * - done: nothing owed at the start of the month
 */
export type PaymentKind = 'minimum' | 'extra' | 'last' | 'short' | 'done';

export interface DebtPayment {
  /** Position in the debts list (and the engine's input). */
  index: number;
  payment: number;
  minimum: number;
  /** payment − minimum when kind is 'extra'; otherwise 0. */
  extra: number;
  kind: PaymentKind;
}

/**
 * What to pay each debt in `month` (1 = this month), read from the projection, so it always matches the payoff dates.
 * One entry per debt in input order, including debts already paid off (kind 'done').
 */
export function paymentsForMonth(planned: ProjectionResult, minimums: number[], month: number): DebtPayment[] {
  const point = planned.points[month];
  const before = planned.points[month - 1];
  if (!point || !before) return [];
  return minimums.map((minimum, index) => {
    const payment = point.debtPayments[index] ?? 0;
    const owedAtStart = before.debtBalances[index] ?? 0;
    let kind: PaymentKind;
    if (owedAtStart <= CENT && payment <= CENT) kind = 'done';
    else if (planned.debtPayoffMonths[index] === month) kind = 'last';
    else if (Math.abs(payment - minimum) < CENT) kind = 'minimum';
    else if (payment > minimum) kind = 'extra';
    else kind = 'short';
    return { index, payment, minimum, extra: kind === 'extra' ? payment - minimum : 0, kind };
  });
}
