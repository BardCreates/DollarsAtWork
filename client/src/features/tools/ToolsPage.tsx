import { useSearchParams } from 'react-router-dom';
import { Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { ToolsHint } from '../hints/PageHints';
import { useMe } from '../../auth/auth';
import { CompoundCalculator, DripCalculator, HabitCalculator, LoanCompareCalculator, PayoffCalculator } from './calculators';
import { TrialCta } from './TrialCta';

const tools = [
  {
    id: 'habit',
    label: 'Cost of a habit',
    about: 'See what a monthly habit could be worth if you invested it instead.',
    view: HabitCalculator,
    cta: { headline: 'Which habits are in your plan?', body: 'Add your own categories and see what every one of them could grow to, as you type.' },
  },
  {
    id: 'compound',
    label: 'Compound interest',
    about: 'See what regular saving or investing grows into.',
    view: CompoundCalculator,
    cta: { headline: 'Build this into a plan', body: 'Add your accounts and your monthly amount, and see your whole net worth projected 40 years out.' },
  },
  {
    id: 'payoff',
    label: 'Early payoff',
    about: 'See how much time and interest an extra payment saves on a loan.',
    view: PayoffCalculator,
    cta: { headline: 'Got more than one debt?', body: 'Add them all and get your debt-free date, with snowball or avalanche payoff and every payment scheduled.' },
  },
  {
    id: 'compare',
    label: 'Loan comparison',
    about: 'Compare two offers for the same loan amount.',
    view: LoanCompareCalculator,
    cta: { headline: 'See how a loan fits your life', body: "Put it in your plan and see what it does to your debt-free date and your net worth in 10 years." },
  },
  {
    id: 'drip',
    label: 'DRIP',
    about: 'See what reinvesting dividends adds compared with taking them as cash.',
    view: DripCalculator,
    cta: { headline: 'See your whole investing picture', body: 'Add your accounts and employer match and watch contributions and growth over 30 years.' },
  },
] as const;

type ToolId = (typeof tools)[number]['id'];

/**
 * Stand-alone calculators, open to anyone. Nothing here is saved or changes a plan. Linkable by tool:
 * /tools?tool=payoff. Visitors who aren't signed in get an invitation to try the real thing under each one.
 */
export function ToolsPage() {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();

  const requested = params.get('tool');
  const tool = tools.find((t) => t.id === requested) ?? tools[0];
  const View = tool.view;

  return (
    <>
      <PageHeader title="Tools" subtitle="Calculators for the questions that come up along the way." />
      <ToolsHint />
      <Tabs
        value={tool.id}
        onChange={(_, value: ToolId) => setParams({ tool: value }, { replace: true })}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 1 }}
      >
        {tools.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {tool.about} Nothing here is saved or changes your plan.
      </Typography>
      <View />
      {!me && <TrialCta headline={tool.cta.headline} body={tool.cta.body} from={`tools/${tool.id}`} />}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Estimates based on the numbers you enter, not financial advice.
      </Typography>
    </>
  );
}
