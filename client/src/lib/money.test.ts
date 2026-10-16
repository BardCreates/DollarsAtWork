import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats whole dollars, and cents only when there are some', () => {
    expect(formatMoney(1234)).toBe('$1,234');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(-250)).toBe('-$250');
  });

  it('never prints a negative zero', () => {
    expect(formatMoney(-0)).toBe('$0');
    expect(formatMoney(-0.004)).toBe('$0'); // rounds to 0 cents
    expect(formatMoney(-0.4, { cents: false })).toBe('$0'); // rounds to 0 whole dollars
    expect(formatMoney(-0.001, { cents: true })).toBe('$0.00');
  });
});
