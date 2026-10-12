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
 *  4. Investments: every account grows on what it held, then receives contributions and employer match.
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
  const otherAssets = input.otherAssets ?? 0;
  const otherLiabilities = input.otherLiabilities ?? 0;
  const startingRemaining = input.remaining ?? 0;
  const raise = (input.incomeGrowthRate ?? 0) / 100;

  const goals = input.goals.map((goal) => Math.max(0, goal.balance));
  const goalRates = input.goals.map((goal) => monthlyRate(goal.apy ?? 0));
  const goalNeed = (i: number) => Math.max(0, input.goals[i].target - goals[i]);

  const debts = input.debts.map((debt) => (debt.balance > DUST ? debt.balance : 0));
  const accounts = input.accounts.map((account) => Math.max(0, account.balance));
  const accountRates = input.accounts.map((account) => monthlyRate(account.expectedReturn ?? DEFAULT_EXPECTED_RETURN));
  const accountWeights = shareWeights(input.accounts.map((account) => account.sharePercent));
  let unassignedInvestments = 0;

  const goalFullMonths: (number | null)[] = input.goals.map((_, i) => (goalNeed(i) <= DUST ? 0 : null));
  const debtPayoffMonths: (number | null)[] = debts.map((balance) => (balance === 0 ? 0 : null));
  let debtFreeMonth: number | null = debts.every((balance) => balance === 0) ? 0 : null;

  let interestPaidToDate = 0;
  let investedToDate = 0;
  let matchedToDate = 0;
  let investmentGrowthToDate = 0;
  const warnings = { debtBudgetBelowMinimums: false, investingWithoutAccounts: false };

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
  const payDebts = (budget: number, payments: number[], interest: number[]): number => {
    debts.forEach((balance, i) => {
      if (balance === 0) return;
      interest[i] = (balance * input.debts[i].apr) / 100 / 12;
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
    for (const i of payoffOrder()) {
      if (left <= 0) break;
      const extra = Math.min(debts[i], left);
      pay(i, extra);
      left -= extra;
    }
    return left > DUST ? left : 0;
  };

  /** Open debts in the order the extra money should reach them. */
  const payoffOrder = (): number[] => {
    const open = debts.map((_, i) => i).filter((i) => debts[i] > 0);
    if (strategy === 'snowball') return open.sort((a, b) => debts[a] - debts[b] || a - b);
    if (strategy === 'avalanche') return open.sort((a, b) => input.debts[b].apr - input.debts[a].apr || debts[a] - debts[b] || a - b);
    return open;
  };

  const snapshot = (month: number, income: number, payments: number[], interest: number[]): MonthPoint => {
    const savings = sum(goals);
    const investments = sum(accounts) + unassignedInvestments;
    const debt = sum(debts);
    return {
      month,
      income,
      remaining: startingRemaining + (income - input.monthlyIncome),
      savings,
      investments,
      debt,
      otherAssets,
      otherLiabilities,
      netWorth: savings + investments + otherAssets - debt - otherLiabilities,
      goalBalances: [...goals],
      debtBalances: [...debts],
      accountBalances: [...accounts],
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
    const income = input.monthlyIncome * Math.pow(1 + raise, Math.floor(month / 12));

    // 1. Savings
    deposits = goals.map(() => 0);
    goals.forEach((balance, i) => {
      goals[i] = balance * (1 + goalRates[i]);
    });
    let freedFromSavings = fillGoals(input.savingsMonthly);

    // 2. Debt
    const payments = zeros();
    const interest = zeros();
    let debtBudget = input.debtMonthly;
    if (savingsDoneDestination === 'debt') {
      debtBudget += freedFromSavings;
      freedFromSavings = 0;
    }
    let freedFromDebt = payDebts(debtBudget, payments, interest);
    interestPaidToDate += sum(interest);

    // 3. Freed money moves on. Anything that can't be placed ends up invested.
    let toInvest = input.investmentsMonthly;
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
      const growth = unassignedInvestments * monthlyRate(DEFAULT_EXPECTED_RETURN);
      unassignedInvestments += growth + toInvest;
      investmentGrowthToDate += growth;
      investedToDate += toInvest;
      if (toInvest > 0) warnings.investingWithoutAccounts = true;
    } else {
      accounts.forEach((balance, i) => {
        const account = input.accounts[i];
        const growth = balance * accountRates[i];
        const contribution = toInvest * accountWeights[i];
        const matchable =
          account.matchLimitPercent === undefined ? contribution : Math.min(contribution, (income * account.matchLimitPercent) / 100);
        const match = (matchable * (account.matchPercent ?? 0)) / 100;

        accounts[i] = balance + growth + contribution + match;
        investmentGrowthToDate += growth;
        investedToDate += contribution;
        matchedToDate += match;
      });
    }

    // Milestones
    goals.forEach((_, i) => {
      if (goalFullMonths[i] === null && goalNeed(i) <= DUST) goalFullMonths[i] = month;
    });
    debts.forEach((balance, i) => {
      if (debtPayoffMonths[i] === null && balance === 0) debtPayoffMonths[i] = month;
    });
    if (debtFreeMonth === null && debts.every((balance) => balance === 0)) debtFreeMonth = month;

    points.push(snapshot(month, income, payments, interest));
  }

  return {
    points: input.todaysDollars ? points.map((point) => inTodaysDollars(point, input.inflationRate ?? DEFAULT_INFLATION_RATE)) : points,
    debtFreeMonth,
    debtPayoffMonths,
    goalFullMonths,
    totalInterest: interestPaidToDate,
    warnings,
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
    unassignedInvestments: scale(point.unassignedInvestments),
  };
}
