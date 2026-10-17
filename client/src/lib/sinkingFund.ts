/**
 * Months until a sinking fund's bill is next due: the saved due date, moved on by whole repeats once it has passed.
 * A bill due later this month (today included) is 0: it still has to be paid from what's saved. Null for an
 * ordinary goal or a date that can't be read.
 */
export function nextDueMonths(goal: { targetDate: string | null; repeatMonths: number | null }, from: Date = new Date()): number | null {
  if (!goal.repeatMonths || !goal.targetDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(goal.targetDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let months = (year - from.getFullYear()) * 12 + (month - 1 - from.getMonth());
  // Gone by: an earlier month, or earlier this month. Step on by whole repeats until it's ahead (or later today).
  const gone = (m: number) => m < 0 || (m === 0 && day < from.getDate());
  if (gone(months)) months += goal.repeatMonths * Math.ceil(-months / goal.repeatMonths);
  if (gone(months)) months += goal.repeatMonths;
  return months;
}
