/**
 * The IRS's yearly limits on what a person can put into tax-advantaged accounts, for the warning on the Invest page.
 * Update these each November when the IRS announces next year's figures.
 * Source: IRS 2026 limits (401(k) deferral $24,500; IRA $7,500 shared by traditional and Roth; HSA $4,400 self-only,
 * $8,750 family; catch-ups $8,000, $1,100 and $1,000).
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
  '401k': { group: '401k', label: '401(k)', limit: 24_500, higher: '$32,500 if you are 50 or older' },
  // Traditional and Roth IRAs share one limit.
  ira: { group: 'ira', label: 'IRA and Roth IRA together', limit: 7_500, higher: '$8,600 if you are 50 or older' },
  hsa: { group: 'hsa', label: 'HSA', limit: 4_400, higher: '$8,750 with family coverage, plus $1,000 at 55 or older' },
};

const groupOf: Partial<Record<string, LimitGroup>> = { Retirement401k: '401k', Ira: 'ira', RothIra: 'ira', Hsa: 'hsa' };

export interface LimitWarning extends ContributionLimit {
  /** What the plan puts in over a year: its share of the monthly amount plus paycheck contributions, before any match. */
  yearly: number;
}

/**
 * The account groups whose yearly contributions in the plan go over the IRS limit. Employer match doesn't count
 * against the employee limit, so it is left out. Brokerage and Other accounts have no limit.
 */
export function overLimit(accounts: { type: string; monthly: number }[]): LimitWarning[] {
  const totals = new Map<LimitGroup, number>();
  for (const account of accounts) {
    const group = groupOf[account.type];
    if (group) totals.set(group, (totals.get(group) ?? 0) + Math.max(0, account.monthly) * 12);
  }
  return [...totals]
    .filter(([group, yearly]) => yearly > contributionLimits[group].limit + 0.005)
    .map(([group, yearly]) => ({ ...contributionLimits[group], yearly }));
}
