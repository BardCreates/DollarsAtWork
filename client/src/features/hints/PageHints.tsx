import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { Hint } from './Hint';
import { useShowHint } from './hints';

/**
 * The words for each page's first-time hint. Kept in one place so the voice stays the same everywhere.
 * Every hint says what the page is for and the one thing to try first.
 */

const to = (path: string, label: string) => (
  <Link component={RouterLink} to={path} underline="hover">
    {label}
  </Link>
);

/** The guided tour: how the pages fit together. Shown once, on the dashboard. */
export function TourHint() {
  return (
    <Hint id="tour" title="Welcome! Here's how it all fits together" helpSlug="getting-started">
      <ul>
        <li>{to('/plan', 'Plan')}: enter your take-home pay and give every dollar a job.</li>
        <li>
          {to('/savings', 'Savings')}, {to('/debt', 'Debt')} and {to('/invest', 'Invest')}: tell each one where its monthly amount goes.
        </li>
        <li>{to('/assets', 'Assets')}: add your home, car and anything else you own.</li>
        <li>Dashboard: see where it all leads, and check in once a month to keep it true.</li>
        <li>
          {to('/what-if', 'What if')}: try a different plan without touching your real one.
        </li>
      </ul>
      <p>Each page has a short hint like this one the first time you visit. The {to('/help', 'Help')} guide covers everything in more detail.</p>
    </Hint>
  );
}

export function DashboardHint() {
  // One hint at a time on the dashboard: the tour comes first.
  const tourShowing = useShowHint('tour');
  if (tourShowing) return null;
  return (
    <Hint id="dashboard" title="Your future, one slider away" helpSlug="dashboard">
      <p>
        Drag the years slider to see your net worth up to 40 years out. Amounts start in today's dollars, after inflation; switch Today's dollars off to see future dollars. Once a month, press Start check-in to update
        your balances.
      </p>
    </Hint>
  );
}

export function PlanHint() {
  return (
    <Hint id="plan" title="Give every dollar a job" helpSlug="plan">
      <p>
        Enter your monthly take-home pay, then fill in the everyday categories and add your own until Remaining reaches $0. Type dollars or a percent, like 10%. Everything saves as you go. Watch the Move a dollar
        panel as you change amounts: it shows what each change does to your debt-free date and your net worth.
      </p>
    </Hint>
  );
}

export function SavingsHint() {
  return (
    <Hint id="savings" title="Turn your Savings amount into goals" helpSlug="savings">
      <p>
        Add something to save for, like an emergency fund. Your Savings amount from Plan fills goals from the top down, or by fixed shares if you choose Percent. When a goal is
        full, its money moves on to the next one.
      </p>
    </Hint>
  );
}

export function DebtHint() {
  return (
    <Hint id="debt" title="See your debt-free date" helpSlug="debt">
      <p>
        Add each card or loan with its balance, APR and minimum payment. Every minimum gets paid, and the rest of your Debt amount goes to one target debt. Snowball picks the
        smallest balance first and Avalanche the highest rate.
      </p>
    </Hint>
  );
}

export function AssetsHint() {
  return (
    <Hint id="assets" title="Count what you own" helpSlug="assets">
      <p>
        Add your home, car or anything else worth money, at what it would sell for today. Each one has a yearly change so the projection can move it. A loan
        with a monthly payment belongs on {to('/debt', 'Debt')}; a house and its mortgage are two separate things, and your net worth counts both.
      </p>
    </Hint>
  );
}

export function InvestHint() {
  return (
    <Hint id="invest" title="Watch your investing grow" helpSlug="invest">
      <p>
        Add your 401(k), IRA or brokerage account with today's balance, plus anything already taken from your paycheck. If your employer matches what you put in, add the match and your salary before taxes; it's free money in your projection. With two
        or more accounts, use Change split to share your Investments amount between them.
      </p>
    </Hint>
  );
}

export function WhatIfHint() {
  return (
    <Hint id="what-if" title="Try a plan without touching yours" helpSlug="what-if">
      <p>
        Press New what-if and change anything: your income, a category, how you pay off debt. You can keep up to 3 and compare them with your real plan on one chart. Your real
        plan never changes here.
      </p>
    </Hint>
  );
}

export function ToolsHint() {
  return (
    <Hint id="tools" title="Quick answers, nothing saved" helpSlug="tools">
      <p>Pick a calculator from the tabs and change the numbers; the results update as you type. Nothing here touches your plan.</p>
    </Hint>
  );
}
