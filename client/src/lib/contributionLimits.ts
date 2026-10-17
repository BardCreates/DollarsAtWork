/**
 * The IRS's yearly limits on what a person can put into tax-advantaged accounts, for the warning on the Invest page.
 * Update these each November when the IRS announces next year's figures.
 * Source: IRS 2026 limits (401(k) deferral $24,500; IRA $7,500 shared by traditional and Roth; HSA $4,400 self-only,
 * $8,750 family; catch-ups $8,000 at 50+ ($11,250 at 60 to 63), $1,100 and $1,000).
 * The limits are per person; the app doesn't know whose account is whose, so accounts are checked one by one and
 * then together, and a warning says which.
 */
export const LIMITS_YEAR = 2026;

export type LimitGroup = '401k' | 'ira' | 'hsa';

export interface ContributionLimit {
  group: LimitGroup;
  /** How the warning names the account kind. */
  label: string;
  limit: number;
  /** The higher limit some people get, described in words: age catch-up, family coverage. */
  higher: string;
}

export const contributionLimits: Record<LimitGroup, ContributionLimit> = {
  '401k': { group: '401k', label: '401(k)', limit: 24_500, higher: '$32,500 if you are 50 or older, $35,750 at 60 to 63' },
  // Traditional and Roth IRAs share one limit.
  ira: { group: 'ira', label: 'IRA and Roth IRA together', limit: 7_500, higher: '$8,600 if you are 50 or older' },
  hsa: { group: 'hsa', label: 'HSA', limit: 4_400, higher: '$8,750 with family coverage, plus $1,000 at 55 or older; money from your employer counts too' },
};

const groupOf: Partial<Record<string, LimitGroup>> = { Retirement401k: '401k', Ira: 'ira', RothIra: 'ira', Hsa: 'hsa' };

export interface LimitWarning extends ContributionLimit {
  /** What the plan puts in over a year: its share of the monthly amount plus paycheck contributions, before any match. */
  yearly: number;
  /**
   * True when no one account is over and only the group's total is: fine if the accounts belong to two people
   * (the limits are per person), too much if they're all one person's.
   */
  together: boolean;
}

/**
 * The account groups whose yearly contributions in the plan go over the IRS limit. Employer match doesn't count
 * against the employee limit, so it is left out. Brokerage and Other accounts have no limit.
 */
export function overLimit(accounts: { type: string; monthly: number }[]): LimitWarning[] {
  const totals = new Map<LimitGroup, number>();
  const anyOneOver = new Set<LimitGroup>();
  for (const account of accounts) {
    const group = groupOf[account.type];
    if (!group) continue;
    const yearly = Math.max(0, account.monthly) * 12;
    totals.set(group, (totals.get(group) ?? 0) + yearly);
    if (yearly > contributionLimits[group].limit + 0.005) anyOneOver.add(group);
  }
  return [...totals]
    .filter(([group, yearly]) => yearly > contributionLimits[group].limit + 0.005)
    .map(([group, yearly]) => ({ ...contributionLimits[group], yearly, together: !anyOneOver.has(group) }));
}
