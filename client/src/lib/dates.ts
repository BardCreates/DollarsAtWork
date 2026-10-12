/** Turning "months from now" into things people read. The projection engine itself never touches dates. */

const monthAndYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

export function dateInMonths(months: number, from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + months, 1);
}

/** "Mar 2029" for a number of months from now. */
export function formatMonthFromNow(months: number, from?: Date): string {
  return monthAndYear.format(dateInMonths(months, from));
}

/** "8 months", "1 year", "2 years 3 months". */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (rest > 0 || years === 0) parts.push(rest === 1 ? '1 month' : `${rest} months`);
  return parts.join(' ');
}
