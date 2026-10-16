import { describe, expect, it } from 'vitest';
import type { Me } from '../../auth/auth';
import { outlookForEmail, outlookOf, type Outlook } from '../dashboard/useDashboard';
import type { ProjectionResult } from '../../lib/projection';
import { shouldSendWelcome } from './welcomeEmail';

const me: Me = {
  id: 'u1',
  email: 'alex@example.com',
  emailConfirmed: true,
  access: {
    status: 'Trialing',
    hasFullAccess: true,
    trialEndsAt: '2026-11-15T00:00:00Z',
    trialDaysLeft: 30,
    currentPeriodEnd: null,
    billingInterval: null,
    hasBillingAccount: false,
  },
  hints: { off: false, dismissed: [] },
  welcomeEmailSent: false,
};

const outlook: Outlook = { hasDebt: true, debtFreeMonth: 14, netWorthIn10Years: 52_300.6 };

describe('shouldSendWelcome', () => {
  it('sends once the first projection is there and nothing has gone out', () => {
    expect(shouldSendWelcome(me, outlook, false)).toBe(true);
  });

  it('does nothing while signed out or still loading', () => {
    expect(shouldSendWelcome(null, outlook, false)).toBe(false);
    expect(shouldSendWelcome(undefined, outlook, false)).toBe(false);
  });

  it('waits for a projection', () => {
    expect(shouldSendWelcome(me, null, false)).toBe(false);
    expect(shouldSendWelcome(me, undefined, false)).toBe(false);
  });

  it('never sends twice: not after the server says it went out, not after a try this session', () => {
    expect(shouldSendWelcome({ ...me, welcomeEmailSent: true }, outlook, false)).toBe(false);
    expect(shouldSendWelcome(me, outlook, true)).toBe(false);
  });
});

describe('outlookForEmail', () => {
  it('rounds the 10-year figure to whole dollars and keeps the debt-free month when there is debt', () => {
    // 52,300.6 rounds to 52,301; 14 months stays 14.
    expect(outlookForEmail(outlook)).toEqual({ debtFreeMonth: 14, netWorthIn10Years: 52_301 });
  });

  it('leaves the debt-free month out when there is no debt, even though the engine says month 0', () => {
    expect(outlookForEmail({ hasDebt: false, debtFreeMonth: 0, netWorthIn10Years: 1_000 })).toEqual({ debtFreeMonth: null, netWorthIn10Years: 1_000 });
  });
});

describe('outlookOf', () => {
  // A tiny stand-in for the engine's result: 13 points (months 0 to 12) worth $100 more each month, so month 12 is $1,200.
  // With fewer than 121 points the 10-year figure falls back to the last point.
  const result = {
    points: Array.from({ length: 13 }, (_, month) => ({ netWorth: month * 100 })),
    debtFreeMonth: 9,
    debtPayoffMonths: [9],
  } as unknown as ProjectionResult;

  it('reads the debt-free month and the last point when the run is shorter than 10 years', () => {
    expect(outlookOf(result)).toEqual({ hasDebt: true, debtFreeMonth: 9, netWorthIn10Years: 1_200 });
  });

  it('knows there is no debt when every payoff month is 0', () => {
    expect(outlookOf({ ...result, debtFreeMonth: 0, debtPayoffMonths: [0, 0] } as ProjectionResult).hasDebt).toBe(false);
  });
});
