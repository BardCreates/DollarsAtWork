/** Turning "months from now" into things people read. The projection engine itself never touches dates. */

const monthAndYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

export function dateInMonths(months: number, from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + months, 1);
}

/** "Mar 2029" for a number of months from now. */
export function formatMonthFromNow(months: number, from?: Date): string {
  return monthAndYear.format(dateInMonths(months, from));
}

/** "2027-11": the year and month `months` from now, in this browser's own time zone. Sent to the server so emails name the same month. */
export function yearMonthFromNow(months: number, from?: Date): string {
  const date = dateInMonths(months, from);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-10-16": today's date in this browser's own time zone (not UTC's). */
export function localToday(from: Date = new Date()): string {
  return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
}

const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const weekdayDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/**
 * When a moment happens, in this browser's time zone, for a sentence: "today at 9:12 PM", "tomorrow at 9:12 PM"
 * or "on Tuesday, November 17 at 9:12 PM". Used for the trial's end, which is a moment, not a calendar day.
 */
export function formatMomentFromNow(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const days = Math.round(
    (new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000,
  );
  // Newer ICU puts a narrow no-break space before AM/PM; a plain space reads the same and matches everywhere.
  const time = clock.format(at).replace(/\s+/g, ' ');
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `on ${weekdayDate.format(at)} at ${time}`;
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
