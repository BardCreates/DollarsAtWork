/**
 * What each post asks the reader to do, matched to its topic. A post picks one with "cta:" in its details block.
 * Visitors get the sign-up ask (shown partway through the post and again at the end); signed-in readers get a
 * link to the page in their own plan where they can try it.
 */
export const CTA_KINDS = ['debt', 'payoff', 'savings', 'invest', 'budget', 'habit'] as const;
export type CtaKind = (typeof CTA_KINDS)[number];

export interface PostCta {
  headline: string;
  body: string;
  /** The sign-up button's words. */
  button: string;
  /** A free page to try first, no account needed. */
  secondary: { label: string; to: string };
  /** For signed-in readers: where to try it in their own plan. */
  inApp: { label: string; to: string };
}

export const POST_CTAS: Record<CtaKind, PostCta> = {
  debt: {
    headline: 'See your own debt-free date',
    body: "Add your cards and loans, pick snowball or avalanche, and see the month you're debt-free and the interest you'll save. Move a dollar and watch the date change.",
    button: 'Find my debt-free date',
    secondary: { label: 'Try the payoff calculator', to: '/tools?tool=payoff' },
    inApp: { label: 'Open your Debt page', to: '/debt' },
  },
  payoff: {
    headline: 'See how much sooner you could be done',
    body: 'Put your loan next to your other debts and goals, try any extra amount, and see what it does to every date in your plan.',
    button: 'Start my free plan',
    secondary: { label: 'Try the payoff calculator', to: '/tools?tool=payoff' },
    inApp: { label: 'Open your Debt page', to: '/debt' },
  },
  savings: {
    headline: 'See when your goals will be done',
    body: "Set a goal like an emergency fund, enter your account's real rate, and see the month it's full. Change your plan and watch the date move.",
    button: 'Plan my savings',
    secondary: { label: 'Try the compound interest calculator', to: '/tools?tool=compound' },
    inApp: { label: 'Open your Savings page', to: '/savings' },
  },
  invest: {
    headline: 'See what your investing could grow into',
    body: 'Add your 401(k), IRA or brokerage account and your employer match, and see your net worth projected up to 40 years out.',
    button: 'Start my free plan',
    secondary: { label: 'Try the compound interest calculator', to: '/tools?tool=compound' },
    inApp: { label: 'Open your Invest page', to: '/invest' },
  },
  budget: {
    headline: 'Give every dollar a job',
    body: 'Split your take-home pay into categories and watch your debt-free date and 10-year net worth move as you change any amount.',
    button: 'Build my free plan',
    secondary: { label: 'See a sample plan', to: '/demo' },
    inApp: { label: 'Open your Plan', to: '/plan' },
  },
  habit: {
    headline: 'What are your habits worth?',
    body: 'Add your everyday categories and see what each one could grow to in 10 years if it went to work for you instead.',
    button: 'Build my free plan',
    secondary: { label: 'Try the cost of a habit calculator', to: '/tools?tool=habit' },
    inApp: { label: 'Open your Plan', to: '/plan' },
  },
};

export function isCtaKind(value: string): value is CtaKind {
  return (CTA_KINDS as readonly string[]).includes(value);
}
