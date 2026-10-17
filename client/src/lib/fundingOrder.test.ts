import { describe, expect, it } from 'vitest';
import { nextFundingStep, type FundingInput } from './fundingOrder';

/** A plan that has done every step: 1,000 saved, the full match, no costly debt, 15% invested. */
function onTrack(overrides: Partial<FundingInput> = {}): FundingInput {
  return {
    takeHome: 5_000,
    savingsMonthly: 200,
    investmentsMonthly: 750,
    savedToday: 2_000,
    debts: [],
    // 750 a month is 15% of 5,000. Match 50% up to 6% of 5,000 = 300, and 750 covers it.
    accounts: [{ name: '401(k)', monthly: 750, fromPlan: 750, matchPercent: 50, matchLimitPercent: 6, salaryMonthly: null }],
    expectedReturn: 7,
    ...overrides,
  };
}

describe('nextFundingStep', () => {
  it('is null when every step is covered', () => {
    expect(nextFundingStep(onTrack())).toBeNull();
  });

  it('asks for a starter fund first when nothing is saved or being saved', () => {
    expect(nextFundingStep(onTrack({ savedToday: 300, savingsMonthly: 0 }))).toEqual({ kind: 'starter-fund', target: 1_000 });
    // Already saving each month counts as on the way.
    expect(nextFundingStep(onTrack({ savedToday: 300, savingsMonthly: 50 }))).toBeNull();
  });

  it('then the full employer match, measured against salary before taxes when known', () => {
    // Salary 7,500 a month: the cap is 6% = 450. Putting in 200 leaves 250 unmatched; 50% of 250 = 125 more match.
    const step = nextFundingStep(
      onTrack({ accounts: [{ name: '401(k)', monthly: 200, fromPlan: 200, matchPercent: 50, matchLimitPercent: 6, salaryMonthly: 7_500 }] }),
    );
    expect(step).toEqual({ kind: 'match', account: '401(k)', matchPercent: 50, limitPercent: 6, missing: 250, extraMatch: 125 });
  });

  it('then high-interest debt, when the plan invests past the match', () => {
    // Cap 300; the plan puts 750 in, so 450 goes past the match while a 24% card is open.
    const step = nextFundingStep(onTrack({ debts: [{ name: 'Visa', balance: 4_000, apr: 24, minimumOnly: false }] }));
    expect(step).toEqual({ kind: 'high-interest', debt: 'Visa', apr: 24, expectedReturn: 7 });
  });

  it('does not push debt over investing when the plan only collects the match', () => {
    // 300 in, exactly the cap: nothing beyond the match to move. The debt is open, so no 15% nudge either.
    const step = nextFundingStep(
      onTrack({
        investmentsMonthly: 300,
        accounts: [{ name: '401(k)', monthly: 300, fromPlan: 300, matchPercent: 50, matchLimitPercent: 6, salaryMonthly: null }],
        debts: [{ name: 'Visa', balance: 4_000, apr: 24, minimumOnly: false }],
      }),
    );
    expect(step).toBeNull();
  });

  it('ignores low-rate debt and a mortgage', () => {
    const step = nextFundingStep(
      onTrack({
        debts: [
          { name: 'Car', balance: 9_000, apr: 4, minimumOnly: false },
          { name: 'Mortgage', balance: 200_000, apr: 9, minimumOnly: true },
        ],
      }),
    );
    expect(step).toBeNull();
  });

  it('finally suggests investing about 15% of income', () => {
    // 400 of 5,000 is 8%; 15% would be 750.
    const step = nextFundingStep(
      onTrack({ investmentsMonthly: 400, accounts: [{ name: 'Roth', monthly: 400, fromPlan: 400, matchPercent: null, matchLimitPercent: null, salaryMonthly: null }] }),
    );
    expect(step).toEqual({ kind: 'retirement', sharePercent: 8, target: 750, ofSalary: false });
  });

  it('measures the 15% against pay before taxes when an account knows the salary', () => {
    // Paycheck 750 into a 401(k), salary 7,500 a month, take-home 5,000. 750 of 5,000 would look like 15%, but of
    // 7,500 it's 10%; 15% of 7,500 is 1,125. Match 50% up to 6% of 7,500 = 450 cap, met by the 750.
    const step = nextFundingStep(onTrack({ accounts: [{ name: '401(k)', monthly: 750, fromPlan: 0, matchPercent: 50, matchLimitPercent: 6, salaryMonthly: 7_500 }] }));
    expect(step).toEqual({ kind: 'retirement', sharePercent: 10, target: 1_125, ofSalary: true });
  });

  it('counts paycheck money toward the match and the 15%', () => {
    // 600 from the paycheck + 150 from the plan = 750 (15%), and the 300 cap is met by the paycheck alone.
    expect(nextFundingStep(onTrack({ accounts: [{ name: '401(k)', monthly: 750, fromPlan: 150, matchPercent: 50, matchLimitPercent: 6, salaryMonthly: null }] }))).toBeNull();
  });

  it('says nothing without an income', () => {
    expect(nextFundingStep(onTrack({ takeHome: 0, savedToday: 0, savingsMonthly: 0 }))).toBeNull();
  });
});
