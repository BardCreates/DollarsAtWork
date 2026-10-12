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
}

/**
 * Dividend reinvestment, year by year. Each year the holding pays its yield on the starting value,
 * grows by the price growth, and receives the year's contributions at the end.
 */
export function drip(input: { initial: number; yearlyContribution: number; priceGrowth: number; dividendYield: number; years: number }): DripYear[] {
  const years = Math.max(0, Math.floor(input.years));
  const growth = input.priceGrowth / 100;
  const dividendYield = input.dividendYield / 100;
  const contribution = Math.max(0, input.yearlyContribution);

  let reinvested = Math.max(0, input.initial);
  let shares = reinvested;
  let cash = 0;
  const rows: DripYear[] = [{ year: 0, reinvested, notReinvested: shares, dividends: 0 }];

  for (let year = 1; year <= years; year++) {
    const dividends = reinvested * dividendYield;
    reinvested = reinvested * (1 + growth) + dividends + contribution;

    cash += shares * dividendYield;
    shares = shares * (1 + growth) + contribution;

    rows.push({ year, reinvested, notReinvested: shares + cash, dividends });
  }
  return rows;
}
