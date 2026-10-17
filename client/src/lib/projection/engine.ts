import type { FreedMoneyDestination, MonthPoint, ProjectionInput, ProjectionResult } from './types';

/**
 * The one month-by-month simulation behind every module and the dashboard.
 * Pure: no I/O, no dates, no rounding. The same input always gives the same output.
 *
 * Each month, in this order:
 *  1. Savings: every goal earns interest on what it held, then the savings amount is shared out.
 *  2. Debt: every debt is charged interest, then minimums are paid, then the rest of the debt
 *     budget goes to the target debt (and on to the next one if the target is cleared).
 *  3. Money whose job is finished (all goals full, all debt paid) moves to its chosen destination.
 *  4. Investments: every account grows on what it held, then receives contributions (its share of the plan's
 *     amount plus anything paid in straight from the paycheck) and employer match.
 *  5. Other items (a home, a car) move by their own yearly change.
 *
 * A sinking fund (a goal that repeats) pays its bill at the end of each due month, after that month's deposits, and
 * then fills again; its money never counts as finished.
 *
 * A windfall (one-time money) joins its month's savings, debt budget or investing, so it follows the same rules.
 *
 * A debt with a promotional rate (a 0% balance transfer) is charged that rate in months 1 to promoMonths, then its APR;
 * avalanche orders debts by the rate they charge that month.
 *
 * A minimum-only debt (a mortgage) is paid its minimum every month and never receives the extra; the
 * payoff order and the debt-free month skip it.
 *
 * Deposits and payments land at the end of the month, so a new deposit earns nothing in its first month.
 */

export const DEFAULT_EXPECTED_RETURN = 7;
export const DEFAULT_INFLATION_RATE = 3;

/** Balances under half a cent are treated as zero, so rounding dust never keeps a debt open. */
const DUST = 0.005;

/** A yearly percent (APY, expected return) as the monthly rate that compounds to exactly that. */
function monthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function project(input: ProjectionInput): ProjectionResult {
  const horizon = Math.max(0, Math.floor(input.months));
  const savingsMode = input.savingsSplitMode ?? 'priority';
  const strategy = input.debtStrategy ?? 'snowball';
  const debtDoneDestination = input.debtDoneDestination ?? 'investments';
  const savingsDoneDestination = input.savingsDoneDestination ?? 'investments';
  const flatAssets = input.otherAssets ?? 0;
  const flatLiabilities = input.otherLiabilities ?? 0;
  const otherItems = input.otherItems ?? [];
  const itemValues = otherItems.map((item) => Math.max(0, item.value));
  // Nothing can lose more than all of itself in a year.
  const itemRates = otherItems.map((item) => monthlyRate(Math.max(-100, item.yearlyChange ?? 0)));
  const itemTotal = (kind: 'asset' | 'liability') => sum(itemValues.filter((_, i) => otherItems[i].kind === kind));
  const startingRemaining = input.remaining ?? 0;
  /** One-time money by month and destination; months outside the horizon never come up. */
  const windfallIn = (month: number, destination: 'debt' | 'savings' | 'investments') =>
    sum((input.windfalls ?? []).filter((w) => w.month === month && w.destination === destination).map((w) => Math.max(0, w.amount)));
  const raise = (input.incomeGrowthRate ?? 0) / 100;
  const raiseInvested = input.raiseDestination === 'investments';
  const returnAdjustment = input.returnAdjustment ?? 0;
  /** An expected return moved by the range adjustment; nothing can lose more than all of itself. */
  const adjustedRate = (expectedReturn: number) => monthlyRate(Math.max(-100, expectedReturn + returnAdjustment));

  const goals = input.goals.map((goal) => Math.max(0, goal.balance));
  const goalRates = input.goals.map((goal) => monthlyRate(goal.apy ?? 0));
  const goalNeed = (i: number) => Math.max(0, input.goals[i].target - goals[i]);

  const debts = input.debts.map((debt) => (debt.balance > DUST ? debt.balance : 0));
  /** Debts that count toward "debt-free": everything except the minimum-only ones. */
  const inPayoff = (i: number) => !input.debts[i].minimumOnly;
  /** The APR a debt charges in a month: its promotional rate until the promotion ends. */
  const aprIn = (i: number, month: number) => {
    const debt = input.debts[i];
    return debt.promoMonths && debt.promoMonths > 0 && month <= debt.promoMonths ? Math.max(0, debt.promoApr ?? 0) : debt.apr;
  };
  const promoEndBalances: (number | null)[] = input.debts.map(() => null);
  const payoffDone = () => debts.every((balance, i) => balance === 0 || !inPayoff(i));
  const accounts = input.accounts.map((account) => Math.max(0, account.balance));
  const accountRates = input.accounts.map((account) => adjustedRate(account.expectedReturn ?? DEFAULT_EXPECTED_RETURN));
  const accountWeights = shareWeights(input.accounts.map((account) => account.sharePercent));
  let unassignedInvestments = 0;

  const goalFullMonths: (number | null)[] = input.goals.map((_, i) => (goalNeed(i) <= DUST ? 0 : null));
  const debtPayoffMonths: (number | null)[] = debts.map((balance) => (balance === 0 ? 0 : null));
  let debtFreeMonth: number | null = payoffDone() ? 0 : null;

  let interestPaidToDate = 0;
  let investedToDate = 0;
  let matchedToDate = 0;
  let investmentGrowthToDate = 0;
  const warnings = {
    debtBudgetBelowMinimums: false,
    debtGrowing: false,
    investingWithoutAccounts: false,
    growingDebts: input.debts.map(() => false),
    shortBills: input.goals.map(() => false),
  };

  /** What each goal has received so far this month. */
  let deposits = goals.map(() => 0);
  const deposit = (i: number, amount: number) => {
    goals[i] += amount;
    deposits[i] += amount;
  };

  /** Shares a savings amount among the goals and returns what no goal could take. */
  const fillGoals = (amount: number): number => {
    let left = amount;

    if (savingsMode === 'priority') {
      for (let i = 0; i < goals.length && left > 0; i++) {
        const given = Math.min(goalNeed(i), left);
        deposit(i, given);
        left -= given;
      }
      return left;
    }

    // Percent mode: each unfinished goal gets its share. When a goal needs less than its share,
    // the difference is shared again among the goals that still have room.
    for (let round = 0; round <= goals.length && left > DUST; round++) {
      const open = goals.map((_, i) => i).filter((i) => goalNeed(i) > DUST);
      if (open.length === 0) break;

      const weights = shareWeights(open.map((i) => input.goals[i].sharePercent ?? 0));
      const budget = left;
      open.forEach((i, position) => {
        const given = Math.min(goalNeed(i), budget * weights[position]);
        deposit(i, given);
        left -= given;
      });
    }
    return left > DUST ? left : 0;
  };

  /** Charges interest, makes this month's payments, and returns what the debts didn't need. */
  const payDebts = (budget: number, payments: number[], interest: number[], month: number): number => {
    const left = payDebtsOnce(budget, payments, interest, month);
    // A debt that got less than this month's interest grew: say so, since "never paid off" alone doesn't explain why.
    interest.forEach((charged, i) => {
      if (charged > DUST && payments[i] < charged - DUST) {
        warnings.debtGrowing = true;
        warnings.growingDebts[i] = true;
      }
    });
    return left;
  };

  const payDebtsOnce = (budget: number, payments: number[], interest: number[], month: number): number => {
    debts.forEach((balance, i) => {
      if (balance === 0) return;
      interest[i] = (balance * aprIn(i, month)) / 100 / 12;
      debts[i] = balance + interest[i];
    });

    const pay = (i: number, amount: number) => {
      debts[i] -= amount;
      payments[i] += amount;
      if (debts[i] <= DUST) debts[i] = 0;
    };

    const minimums = debts.map((balance, i) => Math.min(Math.max(0, input.debts[i].minPayment), balance));
    if (input.minimumsOnly) {
      minimums.forEach((minimum, i) => pay(i, minimum));
      return 0;
    }

    const minimumsDue = sum(minimums);
    if (budget < minimumsDue - DUST) {
      // Not enough for the minimums: every debt gets the same fraction of what it is owed.
      warnings.debtBudgetBelowMinimums = true;
      minimums.forEach((minimum, i) => pay(i, (minimum * budget) / minimumsDue));
      return 0;
    }

    minimums.forEach((minimum, i) => pay(i, minimum));
    let left = budget - minimumsDue;
    for (const i of payoffOrder(month)) {
      if (left <= 0) break;
      const extra = Math.min(debts[i], left);
      pay(i, extra);
      left -= extra;
    }
    return left > DUST ? left : 0;
  };

  /** Open debts in the order the extra money should reach them. Minimum-only debts never get it. */
  const payoffOrder = (month: number): number[] => {
    const open = debts.map((_, i) => i).filter((i) => debts[i] > 0 && inPayoff(i));
    if (strategy === 'snowball') return open.sort((a, b) => debts[a] - debts[b] || a - b);
    if (strategy === 'avalanche') return open.sort((a, b) => aprIn(b, month) - aprIn(a, month) || debts[a] - debts[b] || a - b);
    return open;
  };

  const snapshot = (month: number, income: number, payments: number[], interest: number[]): MonthPoint => {
    const savings = sum(goals);
    const investments = sum(accounts) + unassignedInvestments;
    const debt = sum(debts);
    const otherAssets = flatAssets + itemTotal('asset');
    const otherLiabilities = flatLiabilities + itemTotal('liability');
    return {
      month,
      income,
      // A raise lands in Remaining unless it is being invested.
      remaining: startingRemaining + (raiseInvested ? 0 : income - input.monthlyIncome),
      savings,
      investments,
      debt,
      otherAssets,
      otherLiabilities,
      netWorth: savings + investments + otherAssets - debt - otherLiabilities,
      goalBalances: [...goals],
      debtBalances: [...debts],
      accountBalances: [...accounts],
      otherItemValues: [...itemValues],
      unassignedInvestments,
      goalDeposits: deposits,
      debtPayments: payments,
      debtInterest: interest,
      interestPaidToDate,
      investedToDate,
      matchedToDate,
      investmentGrowthToDate,
    };
  };

  const zeros = () => debts.map(() => 0);
  const points: MonthPoint[] = [snapshot(0, input.monthlyIncome, zeros(), zeros())];

  for (let month = 1; month <= horizon; month++) {
    // Months 1–12 are the first year at today's income; the first raise is paid in month 13, the next in month 25.
    const raiseFactor = Math.pow(1 + raise, Math.floor((month - 1) / 12));
    const income = input.monthlyIncome * raiseFactor;

    // 1. Savings
    deposits = goals.map(() => 0);
    goals.forEach((balance, i) => {
      goals[i] = balance * (1 + goalRates[i]);
    });
    let freedFromSavings = fillGoals(input.savingsMonthly + windfallIn(month, 'savings'));

    // 2. Debt
    const payments = zeros();
    const interest = zeros();
    let debtBudget = input.debtMonthly + windfallIn(month, 'debt');
    if (savingsDoneDestination === 'debt') {
      debtBudget += freedFromSavings;
      freedFromSavings = 0;
    }
    let freedFromDebt = payDebts(debtBudget, payments, interest, month);
    debts.forEach((balance, i) => {
      if (input.debts[i].promoMonths === month && balance > DUST) promoEndBalances[i] = balance;
    });
    interestPaidToDate += sum(interest);

    // 3. Freed money moves on. Anything that can't be placed ends up invested.
    let toInvest = input.investmentsMonthly + (raiseInvested ? income - input.monthlyIncome : 0) + windfallIn(month, 'investments');
    const send = (amount: number, destination: FreedMoneyDestination) => {
      if (destination !== 'remaining') toInvest += amount;
    };
    if (debtDoneDestination === 'savings') {
      freedFromDebt = fillGoals(freedFromDebt);
      send(freedFromDebt, 'investments');
    } else {
      send(freedFromDebt, debtDoneDestination);
    }
    send(freedFromSavings, savingsDoneDestination);

    // 4. Investments
    if (accounts.length === 0) {
      const growth = unassignedInvestments * adjustedRate(DEFAULT_EXPECTED_RETURN);
      unassignedInvestments += growth + toInvest;
      investmentGrowthToDate += growth;
      investedToDate += toInvest;
      if (toInvest > 0) warnings.investingWithoutAccounts = true;
    } else {
      accounts.forEach((balance, i) => {
        const account = input.accounts[i];
        const growth = balance * accountRates[i];
        const contribution = toInvest * accountWeights[i] + Math.max(0, account.payrollMonthly ?? 0);
        // The match limit is a percent of salary before taxes when it's known, else of take-home pay.
        const salary = account.matchSalaryMonthly === undefined ? income : account.matchSalaryMonthly * raiseFactor;
        const matchable =
          account.matchLimitPercent === undefined ? contribution : Math.min(contribution, (salary * account.matchLimitPercent) / 100);
        const match = (matchable * (account.matchPercent ?? 0)) / 100;

        accounts[i] = balance + growth + contribution + match;
        investmentGrowthToDate += growth;
        investedToDate += contribution;
        matchedToDate += match;
      });
    }

    // 5. Other items
    itemValues.forEach((value, i) => {
      itemValues[i] = value * (1 + itemRates[i]);
    });

    // Milestones
    goals.forEach((_, i) => {
      if (goalFullMonths[i] === null && goalNeed(i) <= DUST) goalFullMonths[i] = month;
    });

    // Sinking funds pay their bill once the month's deposits are in.
    input.goals.forEach((goal, i) => {
      const repeat = goal.repeat;
      if (!repeat || repeat.everyMonths < 1 || month < repeat.firstMonth || (month - repeat.firstMonth) % repeat.everyMonths !== 0) return;
      if (goals[i] < goal.target - DUST) warnings.shortBills[i] = true;
      goals[i] = Math.max(0, goals[i] - goal.target);
      if (goals[i] <= DUST) goals[i] = 0;
    });
    debts.forEach((balance, i) => {
      if (debtPayoffMonths[i] === null && balance === 0) debtPayoffMonths[i] = month;
    });
    if (debtFreeMonth === null && payoffDone()) debtFreeMonth = month;

    points.push(snapshot(month, income, payments, interest));
  }

  return {
    points: input.todaysDollars ? points.map((point) => inTodaysDollars(point, input.inflationRate ?? DEFAULT_INFLATION_RATE)) : points,
    debtFreeMonth,
    debtPayoffMonths,
    goalFullMonths,
    totalInterest: interestPaidToDate,
    warnings,
    promoEndBalances,
  };
}

/** The first month net worth is at or above an amount, or null if it doesn't get there. */
export function firstMonthNetWorthReaches(result: ProjectionResult, amount: number): number | null {
  const point = result.points.find((p) => p.netWorth >= amount);
  return point ? point.month : null;
}

/**
 * The level monthly deposit that takes a goal from its balance to its target in a number of months,
 * allowing for interest. 0 when it gets there without deposits; Infinity when there is no time left.
 */
export function monthlyNeededForGoal(goal: { target: number; balance: number; apy?: number }, months: number): number {
  if (goal.balance >= goal.target) return 0;
  if (months <= 0) return Infinity;
  const rate = monthlyRate(goal.apy ?? 0);
  const growth = Math.pow(1 + rate, months);
  const shortfall = goal.target - goal.balance * growth;
  if (shortfall <= 0) return 0;
  return rate === 0 ? shortfall / months : (shortfall * rate) / (growth - 1);
}

/** The interest a debt charges in one month (APR ÷ 12, as the engine charges it). */
export function monthlyInterest(balance: number, apr: number): number {
  return (Math.max(0, balance) * Math.max(0, apr)) / 100 / 12;
}

/** Turns percent shares into fractions that add up to 1. With no usable shares, everyone gets an equal part. */
function shareWeights(shares: number[]): number[] {
  const positive = shares.map((share) => Math.max(0, share));
  const total = sum(positive);
  return total > 0 ? positive.map((share) => share / total) : shares.map(() => 1 / shares.length);
}

/** Restates a month's balances in today's buying power. Payments and running totals stay as actual dollars. */
function inTodaysDollars(point: MonthPoint, inflationRate: number): MonthPoint {
  const factor = Math.pow(1 + inflationRate / 100, -point.month / 12);
  const scale = (value: number) => value * factor;
  return {
    ...point,
    income: scale(point.income),
    remaining: scale(point.remaining),
    savings: scale(point.savings),
    investments: scale(point.investments),
    debt: scale(point.debt),
    otherAssets: scale(point.otherAssets),
    otherLiabilities: scale(point.otherLiabilities),
    netWorth: scale(point.netWorth),
    goalBalances: point.goalBalances.map(scale),
    debtBalances: point.debtBalances.map(scale),
    accountBalances: point.accountBalances.map(scale),
    otherItemValues: point.otherItemValues.map(scale),
    unassignedInvestments: scale(point.unassignedInvestments),
  };
}
