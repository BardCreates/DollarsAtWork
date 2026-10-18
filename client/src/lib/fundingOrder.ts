/**
 * "What to fund next": the common order most planners suggest for where extra money goes, checked against the plan,
 * so the Plan page can name the one next step that applies. A suggestion, never a rule and never a promise:
 *
 *  1. A small starter emergency fund.
 *  2. The full employer match (it's part of your pay).
 *  3. High-interest debt, before investing beyond the match.
 *  4. Investing about 15% of income for the long run.
 *
 * Pure: the page passes the numbers in. Rates are percents (7 means 7%).
 */

export const STARTER_FUND = 1_000;
/** Debt at or above this APR costs more than investing is expected to earn, so it comes first. */
export const HIGH_INTEREST_APR = 8;
export const RETIREMENT_SHARE = 15;

export interface FundingInput {
  takeHome: number;
  savingsMonthly: number;
  investmentsMonthly: number;
  /** Everything in savings goals today. */
  savedToday: number;
  /**
   * `apr` is the rate that matters for this check; for a promotion the caller decides (the promo rate when the
   * minimums clear it in time, else the APR that follows, with `promoEndsMonth` "YYYY-MM" set).
   */
  debts: { name: string; balance: number; apr: number; minimumOnly: boolean; promoEndsMonth?: string }[];
  accounts: {
    name: string;
    /** What goes in each month: the account's share of the plan plus anything from the paycheck. */
    monthly: number;
    /** Only the plan's share; this is the part that could move to debt. */
    fromPlan: number;
    matchPercent: number | null;
    matchLimitPercent: number | null;
    /** Monthly salary before taxes, when known; the match limit is a percent of it. */
    salaryMonthly: number | null;
  }[];
  /** The plan's weighted expected return, for the debt comparison. */
  expectedReturn: number;
}

export type FundingStep =
  | { kind: 'starter-fund'; target: number }
  | { kind: 'match'; account: string; matchPercent: number; limitPercent: number; missing: number; extraMatch: number }
  | { kind: 'high-interest'; debt: string; apr: number; expectedReturn: number; promoEndsMonth?: string }
  /** `ofSalary`: measured against pay before taxes (known from an account's salary), else take-home pay. */
  | { kind: 'retirement'; sharePercent: number; target: number; ofSalary: boolean };

/** The first step in the order that the plan hasn't covered yet, or null when it's on track. */
export function nextFundingStep(input: FundingInput): FundingStep | null {
  if (input.takeHome <= 0) return null;

  if (input.savedToday < STARTER_FUND && input.savingsMonthly <= 0) return { kind: 'starter-fund', target: STARTER_FUND };

  for (const account of input.accounts) {
    if (!account.matchPercent || account.matchPercent <= 0 || account.matchLimitPercent === null) continue;
    const salary = account.salaryMonthly ?? input.takeHome;
    const cap = (salary * account.matchLimitPercent) / 100;
    const missing = cap - account.monthly;
    // Under a dollar short isn't worth a nudge.
    if (missing >= 1) {
      return {
        kind: 'match',
        account: account.name,
        matchPercent: account.matchPercent,
        limitPercent: account.matchLimitPercent,
        missing,
        extraMatch: (missing * account.matchPercent) / 100,
      };
    }
  }

  // Investing beyond the match while a high-rate debt is open: the debt usually wins.
  const costly = input.debts
    .filter((d) => !d.minimumOnly && d.balance > 0 && d.apr >= HIGH_INTEREST_APR && d.apr > input.expectedReturn)
    .sort((a, b) => b.apr - a.apr)[0];
  if (costly && investingBeyondMatch(input) >= 1) {
    return {
      kind: 'high-interest',
      debt: costly.name,
      apr: costly.apr,
      expectedReturn: input.expectedReturn,
      ...(costly.promoEndsMonth ? { promoEndsMonth: costly.promoEndsMonth } : {}),
    };
  }

  const openPayoffDebt = input.debts.some((d) => !d.minimumOnly && d.balance > 0 && d.apr >= HIGH_INTEREST_APR);
  const investing = input.accounts.reduce((sum, a) => sum + a.monthly, 0) + (input.accounts.length === 0 ? input.investmentsMonthly : 0);
  // The 15% rule of thumb is of pay before taxes; use it when an account knows the salary, else take-home pay.
  // A salary is one person's, so it never counts for less than the household's take-home (two earners).
  const salaries = input.accounts.flatMap((a) => (a.salaryMonthly && a.salaryMonthly > 0 ? [a.salaryMonthly] : []));
  const biggestSalary = salaries.length > 0 ? Math.max(...salaries) : 0;
  const ofSalary = biggestSalary > input.takeHome;
  const pay = ofSalary ? biggestSalary : input.takeHome;
  const sharePercent = (investing / pay) * 100;
  if (!openPayoffDebt && sharePercent < RETIREMENT_SHARE - 0.5) {
    return { kind: 'retirement', sharePercent, target: (pay * RETIREMENT_SHARE) / 100, ofSalary };
  }
  return null;
}

/** The plan's own monthly investing above what's needed to collect every match. */
function investingBeyondMatch(input: FundingInput): number {
  if (input.accounts.length === 0) return input.investmentsMonthly;
  return input.accounts.reduce((sum, account) => {
    if (!account.matchPercent || account.matchLimitPercent === null) return sum + account.fromPlan;
    const cap = ((account.salaryMonthly ?? input.takeHome) * account.matchLimitPercent) / 100;
    const payroll = account.monthly - account.fromPlan;
    // The plan's money that goes past the match cap (paycheck money fills the cap first).
    return sum + Math.max(0, account.fromPlan - Math.max(0, cap - payroll));
  }, 0);
}
