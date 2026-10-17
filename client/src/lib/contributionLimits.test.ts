import { describe, expect, it } from 'vitest';
import { overLimit } from './contributionLimits';

describe('overLimit', () => {
  it('is empty while every account is within its limit', () => {
    // 401(k) 2,000 × 12 = 24,000 ≤ 24,500; Roth 600 × 12 = 7,200 ≤ 7,500.
    expect(overLimit([{ type: 'Retirement401k', monthly: 2_000 }, { type: 'RothIra', monthly: 600 }])).toEqual([]);
  });

  it('counts traditional and Roth IRAs against one shared limit', () => {
    // 400 + 300 = 700 a month = 8,400 a year > 7,500.
    const warnings = overLimit([{ type: 'Ira', monthly: 400 }, { type: 'RothIra', monthly: 300 }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].group).toBe('ira');
    expect(warnings[0].yearly).toBeCloseTo(8_400, 6);
  });

  it('flags an HSA over its self-only limit and ignores accounts with no limit', () => {
    // HSA 400 × 12 = 4,800 > 4,400. Brokerage has no limit.
    const warnings = overLimit([{ type: 'Hsa', monthly: 400 }, { type: 'Brokerage', monthly: 10_000 }]);
    expect(warnings.map((w) => w.group)).toEqual(['hsa']);
  });

  it('a limit reached exactly is not over it', () => {
    // 24,500 ÷ 12 = 2,041.666… a month.
    expect(overLimit([{ type: 'Retirement401k', monthly: 24_500 / 12 }])).toEqual([]);
  });
});
