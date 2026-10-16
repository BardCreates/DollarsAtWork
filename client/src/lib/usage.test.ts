import { describe, expect, it } from 'vitest';
import { BROWSER_USAGE_EVENTS, USAGE_EVENTS, USAGE_EVENT_LABELS, describeChange, isUsageEvent } from './usage';

describe('usage events', () => {
  it('only lets the browser send visits, calculator use and the first projection', () => {
    expect(BROWSER_USAGE_EVENTS).not.toContain('signup');
    expect(BROWSER_USAGE_EVENTS).not.toContain('trial_started');
    expect(BROWSER_USAGE_EVENTS).not.toContain('subscribed');
    for (const name of BROWSER_USAGE_EVENTS) expect(USAGE_EVENTS).toContain(name);
  });

  it('has a label for every event', () => {
    for (const name of USAGE_EVENTS) expect(USAGE_EVENT_LABELS[name]).toBeTruthy();
    expect(isUsageEvent('signup')).toBe(true);
    expect(isUsageEvent('made_up')).toBe(false);
  });
});

describe('describeChange', () => {
  it('says nothing when both periods are empty', () => {
    expect(describeChange(0, 0)).toBeNull();
  });

  it('calls a count with no history new', () => {
    expect(describeChange(4, 0)).toEqual({ text: 'New', direction: 'up' });
  });

  it('gives the change as a whole percent of the previous period', () => {
    // 12 vs 8: up 4 on 8 = 50%
    expect(describeChange(12, 8)).toEqual({ text: '+50%', direction: 'up' });
    // 6 vs 8: down 2 on 8 = 25%
    expect(describeChange(6, 8)).toEqual({ text: '-25%', direction: 'down' });
    // 0 vs 3: down 3 on 3 = 100%
    expect(describeChange(0, 3)).toEqual({ text: '-100%', direction: 'down' });
    // 1 vs 3: down 2 on 3 = 66.67%, rounds to 67
    expect(describeChange(1, 3)).toEqual({ text: '-67%', direction: 'down' });
    expect(describeChange(5, 5)).toEqual({ text: 'Same', direction: 'flat' });
  });
});
