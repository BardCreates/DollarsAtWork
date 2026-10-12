import { ComingSoon } from '../components/ComingSoon';

export function SavingsPage() {
  return (
    <ComingSoon
      title="Savings"
      subtitle="Turn your Savings allocation into finished goals."
      phase="Phase 5"
      points={['Goals with targets and dates.', 'Fill by priority or split by percent.', 'Projected completion dates and an emergency fund template.']}
    />
  );
}

export function DebtPage() {
  return (
    <ComingSoon
      title="Debt"
      subtitle="Use your Debt allocation to pay everything off faster."
      phase="Phase 4"
      points={['Snowball, avalanche or your own order.', 'Debt-free date and full payment schedule.', 'Interest saved compared with paying minimums only.']}
    />
  );
}

export function InvestPage() {
  return (
    <ComingSoon
      title="Invest"
      subtitle="Split your Investment allocation across accounts and watch it grow."
      phase="Phase 6"
      points={['401(k), IRA, brokerage and more.', 'Employer match.', 'Contributions vs growth over time.']}
    />
  );
}

export function ToolsPage() {
  return (
    <ComingSoon
      title="Tools"
      subtitle="Calculators for the questions that come up along the way."
      phase="Phase 9"
      points={['Early loan payoff calculator.', 'DRIP (dividend reinvestment) calculator.', 'Compound interest and loan comparison.']}
    />
  );
}
