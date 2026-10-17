import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { useMe } from '../../auth/auth';
import { SAMPLE_NAMES, SAMPLE_PERSON, SAMPLE_RETIREMENT, SAMPLE_WINDFALL, sampleInput } from '../../lib/sampleData';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { project } from '../../lib/projection';
import { monthNumberReached, WITHDRAWAL_RATE } from '../../lib/retirement';
import { RANGE_POINTS } from '../dashboard/NetWorthCard';
import { signUpPath } from '../../lib/signUp';
import { useRecordVisit } from '../../lib/usage';
import { buildTimeline } from '../../lib/timeline';
import { NetWorthCard } from '../dashboard/NetWorthCard';
import { ProjectionChart } from '../dashboard/ProjectionChart';
import { TimelineCard } from '../dashboard/TimelineCard';
import { TrialCta } from '../tools/TrialCta';
import { SampleImpactCard, useSampleImpact } from './SampleImpactCard';
import { usePageMeta } from '../../lib/usePageMeta';

/**
 * A sample plan anyone can play with, no account needed. All numbers are made up and nothing is saved:
 * it runs the same projection engine as the real app on a fixed example person.
 */
export function DemoPage() {
  usePageMeta('Try a sample plan', 'Play with a made-up monthly plan and watch the debt-free date and 10-year net worth move. No account needed.');
  useRecordVisit('visit_demo');
  const { data: me } = useMe();
  const [year, setYear] = useState(10);
  const { extra, setExtra, result, impact } = useSampleImpact();
  // Alex's retirement number and when the plan gets there; the demo is in today's dollars, like the number.
  const retirementMonth = useMemo(() => monthNumberReached(result, SAMPLE_RETIREMENT.number), [result]);
  const range = useMemo(() => {
    const input = sampleInput(extra);
    return { low: project({ ...input, returnAdjustment: -RANGE_POINTS }), high: project({ ...input, returnAdjustment: RANGE_POINTS }) };
  }, [extra]);
  const timeline = useMemo(
    () =>
      buildTimeline(result, {
        debts: [...SAMPLE_NAMES.debts],
        goals: [...SAMPLE_NAMES.goals],
        windfalls: [SAMPLE_WINDFALL],
        retirement: { amount: SAMPLE_RETIREMENT.number, month: retirementMonth },
      }),
    [result, retirementMonth],
  );

  return (
    <>
      <PageHeader title="See it with a sample plan" subtitle={`${SAMPLE_PERSON.name} ${SAMPLE_PERSON.blurb}`} />

      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={
          me ? undefined : (
            <Button component={RouterLink} to={signUpPath('demo')} color="inherit" size="small" variant="outlined">
              Start free
            </Button>
          )
        }
      >
        These numbers are made up, and nothing here is saved. Try the slider, then make one with your own numbers.
      </Alert>

      <SampleImpactCard extra={extra} onExtraChange={setExtra} result={result} impact={impact} sx={{ mb: 3 }} />

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
        <Box sx={{ display: 'grid', gap: 3, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <NetWorthCard result={result} year={year} onYearChange={setYear} todaysDollars range={range} />
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Projection
              </Typography>
              <ProjectionChart result={result} year={year} />
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ display: 'grid', gap: 3, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <TimelineCard items={timeline} links={false} />
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Retirement number
              </Typography>
              <Typography variant="h5" component="p" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(SAMPLE_RETIREMENT.number)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                25 × {formatMoney(SAMPLE_RETIREMENT.spendingMonthly * 12)} a year of spending, in today's dollars.
              </Typography>
              <Typography sx={{ mt: 1.5 }} color={retirementMonth === null ? 'text.secondary' : 'success.main'}>
                {retirementMonth === null
                  ? `${SAMPLE_PERSON.name}'s investments don't reach it within 40 years on this plan.`
                  : `${SAMPLE_PERSON.name}'s investments reach it around ${formatMonthFromNow(retirementMonth)}, at about ${SAMPLE_RETIREMENT.age + Math.round(retirementMonth / 12)}.`}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
                Based on the {WITHDRAWAL_RATE}% rule of thumb. Move the slider above and watch it change.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {!me && (
        <TrialCta headline="Now make it yours" body="Enter your income, your debts and your goals. It takes about three minutes to see your own 10-year number." secondary={null} from="demo" />
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Estimates based on a made-up plan and assumed returns, not financial advice.
      </Typography>
    </>
  );
}
