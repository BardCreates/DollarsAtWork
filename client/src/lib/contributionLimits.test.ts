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
    // Neither account is over on its own (4,800 and 3,600): it's only too much if both are one person's.
    expect(warnings[0].together).toBe(true);
  });

  it('says when a single account is over by itself', () => {
    // 401(k)s at 2,500 (30,000 a year > 24,500) and 1,500 (18,000): one is over on its own.
    const warnings = overLimit([{ type: 'Retirement401k', monthly: 2_500 }, { type: 'Retirement401k', monthly: 1_500 }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].together).toBe(false);
    expect(warnings[0].yearly).toBeCloseTo(48_000, 6);
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
