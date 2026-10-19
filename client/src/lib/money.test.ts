import { describe, expect, it } from 'vitest';
import { formatMoney, formatWholeMoney, moneyInputProblem, moneyInputText, parseMoneyInput } from './money';

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

describe('formatWholeMoney', () => {
  it('rounds to the dollar like the cards do', () => {
    expect(formatWholeMoney(1234.5678)).toBe('$1,235');
    expect(formatWholeMoney(1234.49)).toBe('$1,234');
    expect(formatWholeMoney(-0.4)).toBe('$0');
  });
});

describe('moneyInputText', () => {
  it('starts an edit box at the cents-rounded amount, not the four stored decimals', () => {
    expect(moneyInputText(1234.5678)).toBe('1234.57');
    expect(moneyInputText(1234.5)).toBe('1234.50');
    expect(moneyInputText(1234.0049)).toBe('1234');
    expect(moneyInputText(1234)).toBe('1234');
  });

  it('shows $0 as 0, or blank when asked', () => {
    expect(moneyInputText(0)).toBe('0');
    expect(moneyInputText(0.004)).toBe('0');
    expect(moneyInputText(0, { emptyForZero: true })).toBe('');
  });

  it('reads back as the same cents', () => {
    expect(parseMoneyInput(moneyInputText(99.999))).toBe(100);
    expect(parseMoneyInput(moneyInputText(12.3456))).toBe(12.35);
  });
});

describe('moneyInputProblem', () => {
  it('accepts what parseMoneyInput accepts', () => {
    expect(moneyInputProblem('1,200')).toBeNull();
    expect(moneyInputProblem('10%', 4_000)).toBeNull();
    expect(moneyInputProblem('')).toBeNull();
  });

  it('says what is wrong', () => {
    expect(moneyInputProblem('-500')).toBe("Amounts can't be negative. Enter 0 or more.");
    expect(moneyInputProblem('-10%', 4_000)).toBe("Amounts can't be negative. Enter 0 or more.");
    expect(moneyInputProblem('10%')).toBe('Enter a dollar amount, not a percent.');
    expect(moneyInputProblem('5000000000')).toBe("That's more than $999,999,999.");
    expect(moneyInputProblem('lots')).toBe('Enter a dollar amount, like 500.');
    expect(moneyInputProblem('lots', 4_000)).toBe('Enter dollars or a percent, like 500 or 10%.');
  });
});
