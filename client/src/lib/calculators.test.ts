import { describe, expect, it } from 'vitest';
import { compoundGrowth, drip, loanCost, loanPayment, loanPayoff } from './calculators';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

describe('compound growth', () => {
  it('a yearly rate compounds to exactly that rate', () => {
    const rows = compoundGrowth({ initial: 10_000, monthly: 0, annualRate: 7, years: 2 });
    expect(rows).toHaveLength(3);
    expect(rows[1].value).toBeCloseTo(10_700, 6);
    expect(rows[2].value).toBeCloseTo(11_449, 6); // 10,000 × 1.07²
    expect(rows[2].contributed).toBe(10_000);
    expect(rows[2].growth).toBeCloseTo(1_449, 6);
  });

  it('with no growth, the value is just what was put in', () => {
    const rows = compoundGrowth({ initial: 1_000, monthly: 100, annualRate: 0, years: 3 });
    expect(rows[3].value).toBeCloseTo(4_600, 6); // 1,000 + 36 × 100
    expect(rows[3].contributed).toBeCloseTo(4_600, 6);
    expect(rows[3].growth).toBeCloseTo(0, 6);
  });

  it('value is always contributed plus growth', () => {
    for (const row of compoundGrowth({ initial: 5_000, monthly: 250, annualRate: 6, years: 20 })) {
      expect(row.value).toBeCloseTo(row.contributed + row.growth, 4);
    }
  });
});

describe('loan payoff', () => {
  // $1,000 at 12% APR (1% a month) paying $100: balances 910.00, 819.10, … cleared in month 11
  // with a last payment of 58.98, so interest = 10 × 100 + 58.98 − 1,000 = 58.98.
  it('matches a hand-worked schedule', () => {
    const result = loanPayoff({ balance: 1_000, apr: 12, payment: 100 });
    expect(result.months).toBe(11);
    expect(result.totalInterest).toBeCloseTo(58.98488, 4);
  });

  it('paying more is faster and cheaper', () => {
    const base = loanPayoff({ balance: 15_000, apr: 7, payment: 300 });
    const extra = loanPayoff({ balance: 15_000, apr: 7, payment: 400 });
    expect(extra.months!).toBeLessThan(base.months!);
    expect(extra.totalInterest).toBeLessThan(base.totalInterest);
  });

  it('a payment that only covers the interest never finishes', () => {
    // 1% of 10,000 is 100 a month in interest.
    expect(loanPayoff({ balance: 10_000, apr: 12, payment: 100 }).months).toBeNull();
  });

  it('with no interest it is just balance ÷ payment', () => {
    expect(loanPayoff({ balance: 1_200, apr: 0, payment: 100 })).toEqual({ months: 12, totalInterest: 0 });
  });
});

describe('loan payment', () => {
  it('with no interest, splits the amount evenly', () => {
    expect(loanPayment(12_000, 0, 24)).toBe(500);
  });

  // 10,000 at 12% APR over 12 months: r = 0.01, payment = 10,000 × 0.01 ÷ (1 − 1.01⁻¹²)
  // 1.01¹² = 1.12682503, so 1 − 1/1.12682503 = 0.11255077, and 100 ÷ 0.11255077 = 888.4879.
  it('matches the amortization formula worked by hand', () => {
    expect(loanPayment(10_000, 12, 12)).toBeCloseTo(888.4879, 3);
  });

  it('that payment really does clear the loan in that many months', () => {
    const payment = loanPayment(10_000, 12, 12);
    expect(loanPayoff({ balance: 10_000, apr: 12, payment }).months).toBe(12);
  });

  it('totals up what the loan costs', () => {
    const cost = loanCost({ amount: 10_000, apr: 12, years: 1 });
    expect(cost.totalPaid).toBeCloseTo(10_661.85, 1); // 12 × 888.4879
    expect(cost.totalInterest).toBeCloseTo(661.85, 1);
  });

  it('a longer term lowers the payment but costs more interest', () => {
    const short = loanCost({ amount: 25_000, apr: 6.5, years: 4 });
    const long = loanCost({ amount: 25_000, apr: 6.5, years: 6 });
    expect(long.payment).toBeLessThan(short.payment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });
});

describe('dividend reinvestment', () => {
  // 10,000, price growth 5%, yield 4%, nothing added.
  // Reinvesting:  year 1 = 10,000 × 1.05 + 400 = 10,900;  year 2 = 10,900 × 1.05 + 436 = 11,881
  // Taking cash:  year 1 shares 10,500 + cash 400 = 10,900; year 2 shares 11,025 + cash (400 + 420) = 11,845
  it('matches the hand-worked two-year example', () => {
    const rows = drip({ initial: 10_000, yearlyContribution: 0, priceGrowth: 5, dividendYield: 4, years: 2 });
    expect(rows[0]).toEqual({ year: 0, reinvested: 10_000, notReinvested: 10_000, dividends: 0 });
    expect(rows[1].reinvested).toBeCloseTo(10_900, 6);
    expect(rows[1].notReinvested).toBeCloseTo(10_900, 6);
    expect(rows[1].dividends).toBeCloseTo(400, 6);
    expect(rows[2].reinvested).toBeCloseTo(11_881, 6);
    expect(rows[2].notReinvested).toBeCloseTo(11_845, 6);
    expect(rows[2].dividends).toBeCloseTo(436, 6);
  });

  it('adds contributions at the end of each year', () => {
    const rows = drip({ initial: 0, yearlyContribution: 1_200, priceGrowth: 0, dividendYield: 0, years: 3 });
    expect(rows[3].reinvested).toBe(3_600);
    expect(rows[3].notReinvested).toBe(3_600);
  });

  it('with no dividends, reinvesting makes no difference', () => {
    const rows = drip({ initial: 5_000, yearlyContribution: 600, priceGrowth: 6, dividendYield: 0, years: 15 });
    expect(rows[15].reinvested).toBeCloseTo(rows[15].notReinvested, 6);
  });

  it('handles a falling share price', () => {
    // 10,000, price −10%, yield 2%: reinvesting gives 10,000 × 0.9 + 200 = 9,200; cash gives 9,000 + 200 = 9,200.
    const rows = drip({ initial: 10_000, yearlyContribution: 0, priceGrowth: -10, dividendYield: 2, years: 1 });
    expect(rows[1].reinvested).toBeCloseTo(9_200, 6);
    expect(rows[1].notReinvested).toBeCloseTo(9_200, 6);
  });
});

describe('loan cost with a term too short for a payment', () => {
  it('has no payment, so the comparison has nothing to compare', () => {
    // 0.02 years rounds to 0 months.
    expect(loanCost({ amount: 25_000, apr: 6.5, years: 0.02 })).toEqual({ payment: 0, totalPaid: 0, totalInterest: 0 });
  });
});
