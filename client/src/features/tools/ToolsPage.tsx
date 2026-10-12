import { useState } from 'react';
import { Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { CompoundCalculator, DripCalculator, LoanCompareCalculator, PayoffCalculator } from './calculators';

const tools = [
  { id: 'compound', label: 'Compound interest', about: 'See what regular saving or investing grows into.', view: CompoundCalculator },
  { id: 'payoff', label: 'Early payoff', about: 'See how much time and interest an extra payment saves on a loan.', view: PayoffCalculator },
  { id: 'compare', label: 'Loan comparison', about: 'Compare two offers for the same loan amount.', view: LoanCompareCalculator },
  { id: 'drip', label: 'DRIP', about: 'See what reinvesting dividends adds compared with taking them as cash.', view: DripCalculator },
] as const;

type ToolId = (typeof tools)[number]['id'];

/** Stand-alone calculators. Nothing here is saved or changes your plan. */
export function ToolsPage() {
  const [active, setActive] = useState<ToolId>('compound');
  const tool = tools.find((t) => t.id === active) ?? tools[0];
  const View = tool.view;

  return (
    <>
      <PageHeader title="Tools" subtitle="Calculators for the questions that come up along the way." />
      <Tabs value={active} onChange={(_, value: ToolId) => setActive(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ mb: 1 }}>
        {tools.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {tool.about} Nothing here is saved or changes your plan.
      </Typography>
      <View />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Estimates based on the numbers you enter, not financial advice.
      </Typography>
    </>
  );
}
