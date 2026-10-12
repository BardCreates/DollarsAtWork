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
  return (showCents ? withCents : wholeDollars).format(rounded);
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
