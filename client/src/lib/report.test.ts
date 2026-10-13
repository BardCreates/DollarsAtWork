import { describe, expect, it } from 'vitest';
import { buildReport, isImprovement, type ReportSnapshot } from './report';

/** Expected numbers are worked out by hand in the comments, not copied from the code's output. */

const september: ReportSnapshot = {
  date: '2026-09-15',
  assets: 15_000,
  liabilities: 5_000,
  netWorth: 10_000,
  savings: 3_000,
  investments: 12_000,
  debts: 5_000,
};

const october: ReportSnapshot = {
  date: '2026-10-12',
  assets: 16_400,
  liabilities: 4_200,
  netWorth: 12_200,
  savings: 3_500,
  investments: 12_900,
  debts: 4_200,
};

describe('the monthly report', () => {
  it('compares the latest check-in with the one before', () => {
    // Net worth 12,200 − 10,000 = +2,200.  Savings 3,500 − 3,000 = +500.  Investments 12,900 − 12,000 = +900.
    // Debt 4,200 − 5,000 = −800 (down, which is the good direction).
    const report = buildReport([september, october])!;
    expect(report.date).toBe('2026-10-12');
    expect(report.previousDate).toBe('2026-09-15');
    expect(report.isFirst).toBe(false);
    expect(report.netWorth).toBe(12_200);
    expect(report.change).toBe(2_200);
    expect(report.areas.map((a) => [a.label, a.value, a.change])).toEqual([
      ['Savings', 3_500, 500],
      ['Investments', 12_900, 900],
      ['Debt', 4_200, -800],
    ]);
  });

  it('does not mind the order the snapshots arrive in', () => {
    expect(buildReport([october, september])).toEqual(buildReport([september, october]));
  });

  it('uses only the two most recent when there are more', () => {
    const august: ReportSnapshot = { ...september, date: '2026-08-14', netWorth: 7_000, savings: 2_000 };
    const report = buildReport([august, september, october])!;
    expect(report.change).toBe(2_200);
    expect(report.areas[0].change).toBe(500);
  });

  it('calls a first-ever check-in a starting point, with nothing to compare', () => {
    const report = buildReport([october])!;
    expect(report.isFirst).toBe(true);
    expect(report.change).toBeNull();
    expect(report.previousDate).toBeNull();
    expect(report.areas.map((a) => a.change)).toEqual([null, null, null]);
  });

  it('shows an area but no change when the previous check-in predates that breakdown', () => {
    const old: ReportSnapshot = { ...september, savings: null, investments: null, debts: null };
    const report = buildReport([old, october])!;
    expect(report.change).toBe(2_200);
    expect(report.areas.map((a) => [a.label, a.value, a.change])).toEqual([
      ['Savings', 3_500, null],
      ['Investments', 12_900, null],
      ['Debt', 4_200, null],
    ]);
  });

  it('leaves out an area that was never recorded', () => {
    const oldLatest: ReportSnapshot = { ...october, savings: null, investments: null, debts: null };
    expect(buildReport([september, oldLatest])!.areas).toEqual([]);
  });

  it('has no report before the first check-in', () => {
    expect(buildReport([])).toBeNull();
  });

  it('reports a fall in net worth as a negative change', () => {
    // 9,000 − 10,000 = −1,000
    expect(buildReport([september, { ...october, netWorth: 9_000 }])!.change).toBe(-1_000);
  });
});

describe('what counts as an improvement', () => {
  const area = (change: number | null, goodWhenUp: boolean) => ({ key: 'savings' as const, label: 'x', value: 0, change, goodWhenUp });

  it('is up for savings and investments, and down for debt', () => {
    expect(isImprovement(area(500, true))).toBe(true);
    expect(isImprovement(area(-500, true))).toBe(false);
    expect(isImprovement(area(-800, false))).toBe(true);
    expect(isImprovement(area(800, false))).toBe(false);
  });

  it('is neither when nothing changed or there is nothing to compare', () => {
    expect(isImprovement(area(0, true))).toBeNull();
    expect(isImprovement(area(0.2, false))).toBeNull();
    expect(isImprovement(area(null, true))).toBeNull();
  });
});
