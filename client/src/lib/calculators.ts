import { project } from './projection';

/**
 * The maths behind the Tools page. Pure functions; rates are percents (7 means 7%).
 * Growth and payoff reuse the projection engine, so a calculator and the dashboard never disagree.
 */

export interface GrowthYear {
  year: number;
  value: number;
  /** The starting amount plus everything added since. */
  contributed: number;
  growth: number;
}

/** Savings or investments growing with a monthly contribution. A yearly rate compounds to exactly that rate. */
export function compoundGrowth(input: { initial: number; monthly: number; annualRate: number; years: number }): GrowthYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const { points } = project({
    months: years * 12,
    monthlyIncome: 0,
    savingsMonthly: 0,
    debtMonthly: 0,
    investmentsMonthly: Math.max(0, input.monthly),
    goals: [],
    debts: [],
    accounts: [{ id: 'calculator', balance: Math.max(0, input.initial), expectedReturn: input.annualRate, sharePercent: 100 }],
  });

  return Array.from({ length: years + 1 }, (_, year) => {
    const point = points[year * 12];
    return { year, value: point.investments, contributed: Math.max(0, input.initial) + point.investedToDate, growth: point.investmentGrowthToDate };
  });
}

export interface PayoffResult {
  /** Months until the loan is cleared, or null if the payment never gets there (within 100 years). */
  months: number | null;
  totalInterest: number;
}

/** How long a loan takes at a fixed monthly payment, and what it costs in interest. */
export function loanPayoff(input: { balance: number; apr: number; payment: number }): PayoffResult {
  const result = project({
    months: 1200,
    monthlyIncome: 0,
    savingsMonthly: 0,
    debtMonthly: Math.max(0, input.payment),
    investmentsMonthly: 0,
    goals: [],
    debts: [{ id: 'calculator', balance: Math.max(0, input.balance), apr: input.apr, minPayment: Math.max(0, input.payment) }],
    accounts: [],
    debtDoneDestination: 'remaining',
  });
  return { months: result.debtFreeMonth, totalInterest: result.totalInterest };
}

/** The level monthly payment that clears a loan in a number of months (the standard amortization formula). */
export function loanPayment(principal: number, apr: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const rate = apr / 100 / 12;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - Math.pow(1 + rate, -months));
}

export interface LoanCost {
  payment: number;
  totalPaid: number;
  totalInterest: number;
}

export function loanCost(input: { amount: number; apr: number; years: number }): LoanCost {
  const months = Math.round(input.years * 12);
  const payment = loanPayment(input.amount, input.apr, months);
  const totalPaid = payment * months;
  return { payment, totalPaid, totalInterest: Math.max(0, totalPaid - Math.max(0, input.amount)) };
}

export interface DripYear {
  year: number;
  /** Dividends buy more shares. */
  reinvested: number;
  /** Dividends are kept as cash: shares plus the cash pile. */
  notReinvested: number;
  /** Dividends paid that year when reinvesting. */
  dividends: number;
  /** Everything put in so far: the starting amount plus the monthly additions. */
  contributed: number;
}

export type PayoutFrequency = 12 | 4 | 2 | 1;

export interface DripInput {
  initial: number;
  /** Added at the end of every month, buying shares at that month's price. */
  monthlyContribution: number;
  /** Yearly change in the share price, as a percent; can be negative. Spread evenly over the months. */
  priceGrowth: number;
  /** Today's dividend yield: a year of dividends as a percent of today's share price. */
  dividendYield: number;
  /** How much the dividend per share is raised each year, as a percent; often different from the price's growth. */
  dividendGrowth: number;
  /** Payouts a year: 12 monthly, 4 quarterly, 2 twice a year, 1 yearly. */
  payoutsPerYear: PayoutFrequency;
  years: number;
}

/**
 * Dividend reinvestment, simulated month by month the way a brokerage pays it.
 *  - The share price moves a twelfth of its yearly growth each month (compounding to exactly the yearly rate).
 *  - On a payout month, every share held is paid the dividend per share; reinvested, it buys shares at that price.
 *  - The dividend per share starts at today's yield and is raised by the dividend growth once a year, after the
 *    year's last payout, so it can grow faster or slower than the price (a dividend-growth stock's yield on cost rises).
 *  - The monthly addition goes in at the end of the month, after any payout.
 * Taxes on dividends are left out.
 */
export function drip(input: DripInput): DripYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const monthlyGrowth = Math.pow(1 + Math.max(-100, input.priceGrowth) / 100, 1 / 12);
  const step = 12 / input.payoutsPerYear;
  const contribution = Math.max(0, input.monthlyContribution);
  const initial = Math.max(0, input.initial);

  // Prices are relative to today's, so a share starts at $1 and the starting amount is that many shares.
  let price = 1;
  let perShare = input.dividendYield / 100 / input.payoutsPerYear;
  let sharesReinvesting = initial;
  let sharesCash = initial;
  let cash = 0;
  let paidThisYear = 0;

  const rows: DripYear[] = [{ year: 0, reinvested: initial, notReinvested: initial, dividends: 0, contributed: initial }];
  for (let month = 1; month <= years * 12; month++) {
    price *= monthlyGrowth;
    if (month % step === 0) {
      const paid = sharesReinvesting * perShare;
      paidThisYear += paid;
      if (price > 0) sharesReinvesting += paid / price;
      cash += sharesCash * perShare;
    }
    if (contribution > 0 && price > 0) {
      sharesReinvesting += contribution / price;
      sharesCash += contribution / price;
    }
    if (month % 12 === 0) {
      rows.push({
        year: month / 12,
        reinvested: sharesReinvesting * price,
        notReinvested: sharesCash * price + cash,
        dividends: paidThisYear,
        contributed: initial + contribution * month,
      });
      paidThisYear = 0;
      perShare *= 1 + input.dividendGrowth / 100;
    }
  }
  return rows;
}
