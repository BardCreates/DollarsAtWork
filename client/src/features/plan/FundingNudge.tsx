import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button } from '@mui/material';
import { nextFundingStep, type FundingStep } from '../../lib/fundingOrder';
import { formatMoney } from '../../lib/money';
import { planExpectedReturn } from '../../lib/planImpact';
import { toDebtInput } from '../debt/debts';
import { useDashboardData } from '../dashboard/useDashboard';
import type { Plan } from './plan';

const amountOf = (plan: Plan, kind: 'Savings' | 'Investment') => plan.categories.find((c) => c.kind === kind)?.amount ?? 0;
const whole = (value: number) => formatMoney(Math.round(value));

/**
 * One suggestion for what to fund next, read from the plan as it's typed (the usual order: starter fund, employer
 * match, high-interest debt, then about 15% invested). Only a suggestion; closing it hides it for this visit.
 */
export function FundingNudge({ plan }: { plan: Plan }) {
  const { data } = useDashboardData();
  const [closed, setClosed] = useState<string | null>(null);

  const step = useMemo(() => {
    if (!data) return null;
    const investing = amountOf(plan, 'Investment');
    const accounts = data.investments.accounts;
    const sharesTotal = accounts.reduce((sum, a) => sum + a.sharePercent, 0) || 100;
    return nextFundingStep({
      takeHome: plan.monthlyIncome,
      savingsMonthly: amountOf(plan, 'Savings'),
      investmentsMonthly: investing,
      savedToday: data.savings.goals.reduce((sum, g) => sum + g.currentBalance, 0),
      // A debt on a promotional rate is judged by the rate it charges now.
      debts: data.debts.debts.map((d) => {
        const engine = toDebtInput(d);
        return { name: d.name, balance: d.balance, apr: engine.promoMonths ? (engine.promoApr ?? 0) : d.apr, minimumOnly: d.minimumOnly };
      }),
      accounts: accounts.map((a) => {
        const fromPlan = (investing * a.sharePercent) / sharesTotal;
        return {
          name: a.name,
          fromPlan,
          monthly: fromPlan + a.payrollMonthly,
          matchPercent: a.matchPercent,
          matchLimitPercent: a.matchLimitPercent,
          salaryMonthly: a.matchSalaryYearly === null ? null : a.matchSalaryYearly / 12,
        };
      }),
      expectedReturn: planExpectedReturn(accounts),
    });
  }, [data, plan]);

  if (!step || closed === step.kind) return null;
  const { title, body } = wording(step);

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      onClose={() => setClosed(step.kind)}
      action={
        <Button component={RouterLink} to="/help/what-to-fund-first" color="inherit" size="small">
          Why this order?
        </Button>
      }
    >
      <AlertTitle>{title}</AlertTitle>
      {body}
    </Alert>
  );
}

function wording(step: FundingStep): { title: string; body: string } {
  switch (step.kind) {
    case 'starter-fund':
      return {
        title: 'Next step: a starter emergency fund',
        body: `Put something into Savings each month until about ${whole(step.target)} is set aside. A surprise bill then comes out of savings instead of landing on a card.`,
      };
    case 'match':
      return {
        title: 'Next step: the full employer match',
        body: `Your employer adds ${step.matchPercent}% on contributions up to ${step.limitPercent}% of your pay. About ${whole(step.missing)} more a month into ${step.account} would collect roughly ${whole(step.extraMatch)} a month more in match.`,
      };
    case 'high-interest':
      return {
        title: `Next step: ${step.debt} before more investing`,
        body: `${step.debt} charges ${Number(step.apr.toFixed(2))}%. Each extra dollar paid on it saves that interest for sure, while investing is expected to earn about ${Number(step.expectedReturn.toFixed(1))}%. Many people keep the match and move the rest of their investing to Debt until it's gone.`,
      };
    case 'retirement':
      return {
        title: 'Next step: invest about 15%',
        body: `You're investing about ${Math.round(step.sharePercent)}% of your take-home pay. Many planners suggest about 15% for the long run, which would be ${whole(step.target)} a month. Even a little more each year helps.`,
      };
  }
}
