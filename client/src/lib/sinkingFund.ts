/** Calendar months from this month to an ISO date's month ("2027-06-15" → its June). */
function monthsTo(isoDate: string, from: Date): number {
  const [year, month] = isoDate.split('-').map(Number);
  return (year - from.getFullYear()) * 12 + (month - 1 - from.getMonth());
}

/**
 * Months until a sinking fund's bill is next due: the saved due date, moved on by whole repeats once it has passed,
 * so a bill due this month or earlier counts from its next time round. Null for an ordinary goal.
 */
export function nextDueMonths(goal: { targetDate: string | null; repeatMonths: number | null }, from: Date = new Date()): number | null {
  if (!goal.repeatMonths || !goal.targetDate) return null;
  let months = monthsTo(goal.targetDate, from);
  if (months < 1) months += goal.repeatMonths * Math.ceil((1 - months) / goal.repeatMonths);
  return months;
}
