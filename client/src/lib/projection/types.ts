/**
 * Inputs and outputs of the projection engine.
 *
 * Conventions used everywhere in this folder:
 * - Money is dollars as a number. Nothing is rounded; round only when displaying.
 * - Every rate and share is a percent: 7 means 7%.
 * - Month 0 is today. Month 1 is one month from now.
 */

export type DebtStrategy = 'snowball' | 'avalanche' | 'custom';
export type SavingsSplitMode = 'priority' | 'percent';

/**
 * Where a monthly amount goes once its own job is finished (all debt paid, or all goals full).
 * 'remaining' means it goes back to the user's unplanned money and is no longer projected.
 */
export type FreedMoneyDestination = 'investments' | 'savings' | 'debt' | 'remaining';

/** A savings goal. List order is the priority order (first fills first). */
export interface GoalInput {
  id: string;
  target: number;
  balance: number;
  /** Annual percentage yield. Default 0. */
  apy?: number;
  /** Share of the monthly savings amount, used in 'percent' mode. */
  sharePercent?: number;
}

/** A debt. List order is the payoff order for the 'custom' strategy. */
export interface DebtInput {
  id: string;
  balance: number;
  /** Annual percentage rate, charged monthly as apr / 12. */
  apr: number;
  /** A promotional rate (0 for a 0% balance transfer) charged instead of apr in months 1 to promoMonths. */
  promoApr?: number;
  /** How many months the promotional rate lasts; after that, apr applies. Left out or 0 means no promotion. */
  promoMonths?: number;
  minPayment: number;
  /**
   * Pay only this debt's minimum and keep it out of the payoff order (a mortgage). It still pays down on its
   * own schedule and still counts against net worth, but the extra money and the debt-free month skip it.
   * Default false.
   */
  minimumOnly?: boolean;
}

/** Where one-time money goes in its month. */
export type WindfallDestination = 'debt' | 'savings' | 'investments';

/** One-time money (a tax refund, a bonus) arriving in one month of the projection. */
export interface WindfallInput {
  id: string;
  /** The projection month it lands in: 1 is next month. Months outside 1 to the horizon are ignored. */
  month: number;
  amount: number;
  /**
   * 'debt': an extra payment that month, to the debt the payoff order targets (anything left over is finished
   * money, like a paid-off debt's). 'savings': shared among the goals like the monthly amount (what the goals can't
   * take is finished money too). 'investments': added to that month's investing, by the split.
   */
  destination: WindfallDestination;
}

/** Something owned or owed that isn't tracked month by month: a home, a car, a loan from family. */
export interface OtherItemInput {
  id: string;
  value: number;
  kind: 'asset' | 'liability';
  /** Yearly change in value as a percent: 3 means it gains 3% a year, −10 means it loses 10%. Default 0. */
  yearlyChange?: number;
}

export interface AccountInput {
  id: string;
  balance: number;
  /** Expected annual return. Default 7. */
  expectedReturn?: number;
  /** Share of the monthly investment amount. Shares that don't total 100 are scaled to fit. */
  sharePercent: number;
  /** Employer adds this percent of each contribution (the plan's share plus the paycheck amount)… */
  matchPercent?: number;
  /** …on contributions up to this percent of monthly salary. Left out means no cap. */
  matchLimitPercent?: number;
  /**
   * Monthly salary before taxes that matchLimitPercent is a percent of; it grows with the yearly raise.
   * Left out means the plan's take-home income is used (which understates the match).
   */
  matchSalaryMonthly?: number;
  /**
   * What already goes in straight from the paycheck each month (a 401(k) deferral). It never passes through
   * take-home pay, so it's added on top of the plan's Investments amount. Default 0.
   */
  payrollMonthly?: number;
}

export interface ProjectionInput {
  /** How many months to simulate (the dashboard slider: 0–480). */
  months: number;

  /** Monthly take-home income. Used for the employer-match cap and the yearly raise. */
  monthlyIncome: number;
  /** Income not given to any category today. Default 0. */
  remaining?: number;

  /** The three built-in category amounts from the plan. */
  savingsMonthly: number;
  debtMonthly: number;
  investmentsMonthly: number;

  goals: GoalInput[];
  /** Default 'priority'. */
  savingsSplitMode?: SavingsSplitMode;

  debts: DebtInput[];
  /** Default 'snowball'. */
  debtStrategy?: DebtStrategy;
  /**
   * Pay only each debt's own minimum and ignore the debt budget. Freed minimums are not reused.
   * This is the "minimums only" comparison line, not a plan anyone should follow.
   */
  minimumsOnly?: boolean;

  accounts: AccountInput[];

  /** One-time money on chosen months. Default none. */
  windfalls?: WindfallInput[];

  /** Home, car and other things owned or owed, each moving by its own yearly change. */
  otherItems?: OtherItemInput[];
  /** Flat totals that never change, added on top of otherItems. Kept for callers with no per-item detail. */
  otherAssets?: number;
  otherLiabilities?: number;

  /** Where the debt budget goes once every debt is paid. Default 'investments'. */
  debtDoneDestination?: FreedMoneyDestination;
  /** Where the savings amount goes once every goal is full. Default 'investments'. */
  savingsDoneDestination?: FreedMoneyDestination;

  /** Report balances in today's buying power. Default false. */
  todaysDollars?: boolean;
  /** Yearly inflation used by todaysDollars. Default 3. */
  inflationRate?: number;
  /** Yearly raise, first paid in month 13 (then 25, 37…): months 1–12 are year one. Default 0. */
  incomeGrowthRate?: number;
  /**
   * Where the raise goes. 'remaining' (the default): unplanned money, not projected. 'investments': added to the
   * month's investing, so contributions grow with income.
   */
  raiseDestination?: 'remaining' | 'investments';
  /**
   * Percentage points added to every account's expected return (and to the default for money with no account),
   * for a lower or higher range around the estimate: −2 means every return is 2 points lower. Default 0.
   */
  returnAdjustment?: number;
}

/** The state of everything at the end of one month. */
export interface MonthPoint {
  month: number;
  income: number;
  remaining: number;

  /** Totals. netWorth = savings + investments + otherAssets − debt − otherLiabilities. */
  savings: number;
  investments: number;
  debt: number;
  otherAssets: number;
  otherLiabilities: number;
  netWorth: number;

  /** Balances, in the same order as the input lists. */
  goalBalances: number[];
  debtBalances: number[];
  accountBalances: number[];
  /** Each other item's value this month, in input order. */
  otherItemValues: number[];
  /** Money invested while there were no accounts to put it in. Grows at the default return. */
  unassignedInvestments: number;

  /** What each goal received this month, in input order. Always actual dollars. */
  goalDeposits: number[];
  /** What happened to each debt this month. Always actual dollars, never inflation-adjusted. */
  debtPayments: number[];
  debtInterest: number[];

  /** Running totals since today. Always actual dollars, never inflation-adjusted. */
  interestPaidToDate: number;
  investedToDate: number;
  matchedToDate: number;
  investmentGrowthToDate: number;
}

export interface ProjectionResult {
  /** One entry per month; points[0] is today and points[n] is n months from now. */
  points: MonthPoint[];

  /**
   * The month the last debt in the payoff order reaches $0; minimum-only debts (a mortgage) don't count.
   * 0 when there is no such debt today; null when not within the horizon.
   */
  debtFreeMonth: number | null;
  /** Per debt, in input order. */
  debtPayoffMonths: (number | null)[];

  /** Per goal, in input order: the month its balance first reaches its target. */
  goalFullMonths: (number | null)[];

  /** Interest paid on all debts over the horizon. */
  totalInterest: number;

  warnings: {
    /** The debt budget didn't cover the minimum payments in at least one month. */
    debtBudgetBelowMinimums: boolean;
    /** In at least one month a debt was paid less than the interest it charged, so its balance grew. */
    debtGrowing: boolean;
    /** Per debt, in input order: true when that debt's payment missed its interest in at least one month. */
    growingDebts: boolean[];
    /** Money was invested with no investment accounts set up. */
    investingWithoutAccounts: boolean;
  };

  /**
   * Per debt, in input order: what is still owed the month its promotional rate ends, when that's more than nothing,
   * so the page can say so before the full APR starts. Null for a debt with no promotion or one cleared in time.
   */
  promoEndBalances: (number | null)[];
}
