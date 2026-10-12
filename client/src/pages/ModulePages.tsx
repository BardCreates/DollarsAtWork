import { ComingSoon } from '../components/ComingSoon';

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
