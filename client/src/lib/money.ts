/** The one place money is formatted and typed amounts are read. */

export const MAX_AMOUNT = 999_999_999.99;

const wholeDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** $1,234 — cents appear only when the amount has them, or when asked for. */
export function formatMoney(value: number, options?: { cents?: boolean }): string {
  const rounded = roundCents(value);
  const showCents = options?.cents ?? !Number.isInteger(rounded);
  // Anything that shows as zero is zero: never "-$0" (or "-$0.00") from a tiny negative left over by the maths.
  const shown = showCents ? rounded : Math.round(rounded);
  return (showCents ? withCents : wholeDollars).format(shown === 0 ? 0 : rounded);
}

/** $1,234 rounded to the dollar, as the cards and chart tooltips show it. Never "-$0". */
export function formatWholeMoney(value: number): string {
  return formatMoney(Math.round(value));
}

/**
 * The text an edit box starts with for a saved amount: cents-rounded ("1234.57", never "1234.5678" from the
 * four decimals the database keeps), with no ".00" on whole dollars, and blank for $0 when emptyForZero.
 */
export function moneyInputText(value: number, options?: { emptyForZero?: boolean }): string {
  const rounded = roundCents(value);
  if (rounded === 0) return options?.emptyForZero ? '' : '0';
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Share of a total as "12.5%", or a dash when there is no total to divide by. */
export function formatPercent(part: number, total: number): string {
  if (total <= 0) return '—';
  const percent = (part / total) * 100;
  return `${Number(percent.toFixed(1))}%`;
}

/**
 * Reads what someone typed into an amount box and returns dollars, or null if it isn't an amount.
 * Accepts "1200", "$1,200.50" and, when percentOf is given, "10%" (10% of that number).
 * An empty box means $0.
 */
export function parseMoneyInput(text: string, percentOf?: number): number | null {
  const cleaned = text.replace(/[\s$,]/g, '');
  if (cleaned === '') return 0;

  const isPercent = cleaned.endsWith('%');
  if (isPercent && percentOf === undefined) return null;

  const digits = isPercent ? cleaned.slice(0, -1) : cleaned;
  if (!/^(\d+\.?\d*|\.\d+)$/.test(digits)) return null;

  const dollars = roundCents(isPercent ? ((percentOf ?? 0) * Number(digits)) / 100 : Number(digits));
  return dollars <= MAX_AMOUNT ? dollars : null;
}

/**
 * Why a typed amount can't be used, in words for the box's helper text, or null when parseMoneyInput accepts it.
 * Say what's wrong ("can't be negative") rather than only what's wanted.
 */
export function moneyInputProblem(text: string, percentOf?: number): string | null {
  if (parseMoneyInput(text, percentOf) !== null) return null;
  const cleaned = text.replace(/[\s$,]/g, '');
  if (cleaned.startsWith('-')) return "Amounts can't be negative. Enter 0 or more.";
  if (cleaned.endsWith('%') && percentOf === undefined) return 'Enter a dollar amount, not a percent.';
  const digits = cleaned.endsWith('%') ? cleaned.slice(0, -1) : cleaned;
  if (/^(\d+\.?\d*|\.\d+)$/.test(digits)) return `That's more than ${formatMoney(Math.floor(MAX_AMOUNT))}.`;
  return percentOf === undefined ? 'Enter a dollar amount, like 500.' : 'Enter dollars or a percent, like 500 or 10%.';
}

const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

/** Short form for chart axes: $1.2K, $350K, $1.5M. */
export function formatMoneyCompact(value: number): string {
  return compact.format(value);
}

/** Reads a typed percent such as "19.99" or "19.99%". Returns null if it isn't one, or is above max. */
export function parsePercentInput(text: string, max = 100): number | null {
  const cleaned = text.replace(/[\s%]/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const percent = Number(cleaned);
  return percent <= max ? percent : null;
}
