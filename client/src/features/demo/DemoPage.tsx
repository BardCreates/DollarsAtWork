import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Slider, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { useMe } from '../../auth/auth';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { comparePlans } from '../../lib/planImpact';
import { project } from '../../lib/projection';
import { SAMPLE_MAX_EXTRA, SAMPLE_NAMES, SAMPLE_PERSON, sampleInput } from '../../lib/sampleData';
import { buildTimeline } from '../../lib/timeline';
import { NetWorthCard } from '../dashboard/NetWorthCard';
import { ProjectionChart } from '../dashboard/ProjectionChart';
import { TimelineCard } from '../dashboard/TimelineCard';
import { TrialCta } from '../tools/TrialCta';

const whole = (value: number) => formatMoney(Math.round(value));

/**
 * A sample plan anyone can play with, no account needed. All numbers are made up and nothing is saved:
 * it runs the same projection engine as the real app on a fixed example person.
 */
export function DemoPage() {
  const { data: me } = useMe();
  const [year, setYear] = useState(10);
  const [extra, setExtra] = useState(0);

  const base = useMemo(() => project(sampleInput(0)), []);
  const result = useMemo(() => project(sampleInput(extra)), [extra]);
  const timeline = useMemo(() => buildTimeline(result, { debts: [...SAMPLE_NAMES.debts], goals: [...SAMPLE_NAMES.goals] }), [result]);
  const impact = useMemo(() => comparePlans(base, result), [base, result]);

  const sooner = impact.debtFree.monthsSooner;
  const gain = Math.round(impact.netWorth.change);

  return (
    <>
      <PageHeader title="See it with a sample plan" subtitle={`${SAMPLE_PERSON.name} ${SAMPLE_PERSON.blurb}`} />

      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={
          me ? undefined : (
            <Button component={RouterLink} to="/sign-up" color="inherit" size="small" variant="outlined">
              Start free
            </Button>
          )
        }
      >
        These numbers are made up, and nothing here is saved. Try the slider, then make one with your own numbers.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Move a dollar, see your future</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            What if {SAMPLE_PERSON.name} put more toward debt each month?
          </Typography>
          <Box sx={{ px: 1.5 }}>
            <Slider
              value={extra}
              min={0}
              max={SAMPLE_MAX_EXTRA}
              step={25}
              marks={[0, 200, 400, 600].map((value) => ({ value, label: value === 0 ? '$0' : `$${value}` }))}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `+${formatMoney(value)}/month`}
              onChange={(_, value) => setExtra(value as number)}
              aria-label="Extra toward debt each month"
            />
          </Box>
          <Box role="status" aria-live="polite" sx={{ display: 'grid', gap: 2, mt: 2, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" component="div">
                Debt-free
              </Typography>
              <Typography variant="h6" component="p">
                {result.debtFreeMonth === null ? 'Not within 40 years' : formatMonthFromNow(result.debtFreeMonth)}
              </Typography>
              <Typography variant="body2" color={sooner && sooner > 0 ? 'success.main' : 'text.secondary'} sx={{ fontWeight: sooner ? 600 : 400 }}>
                {extra === 0 || sooner === null ? ' ' : sooner > 0 ? `${formatDuration(sooner)} sooner` : 'No change'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" component="div">
                Net worth in 10 years
              </Typography>
              <Typography variant="h6" component="p">
                {whole(impact.netWorth.after)}
              </Typography>
              <Typography variant="body2" color={gain > 0 ? 'success.main' : 'text.secondary'} sx={{ fontWeight: gain > 0 ? 600 : 400 }}>
                {extra === 0 ? ' ' : gain > 0 ? `+${whole(gain)}` : 'No change'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
        <Box sx={{ display: 'grid', gap: 3, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <NetWorthCard result={result} year={year} onYearChange={setYear} todaysDollars={false} />
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Projection
              </Typography>
              <ProjectionChart result={result} year={year} />
            </CardContent>
          </Card>
        </Box>
        <TimelineCard items={timeline} links={false} />
      </Box>

      {!me && (
        <TrialCta headline="Now make it yours" body="Enter your income, your debts and your goals. It takes about three minutes to see your own 10-year number." showDemoLink={false} />
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Estimates based on a made-up plan and assumed returns, not financial advice.
      </Typography>
    </>
  );
}
