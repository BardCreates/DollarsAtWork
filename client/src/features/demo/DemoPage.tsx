import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { useMe } from '../../auth/auth';
import { SAMPLE_NAMES, SAMPLE_PERSON } from '../../lib/sampleData';
import { signUpPath } from '../../lib/signUp';
import { buildTimeline } from '../../lib/timeline';
import { NetWorthCard } from '../dashboard/NetWorthCard';
import { ProjectionChart } from '../dashboard/ProjectionChart';
import { TimelineCard } from '../dashboard/TimelineCard';
import { TrialCta } from '../tools/TrialCta';
import { SampleImpactCard, useSampleImpact } from './SampleImpactCard';

/**
 * A sample plan anyone can play with, no account needed. All numbers are made up and nothing is saved:
 * it runs the same projection engine as the real app on a fixed example person.
 */
export function DemoPage() {
  const { data: me } = useMe();
  const [year, setYear] = useState(10);
  const { extra, setExtra, result, impact } = useSampleImpact();
  const timeline = useMemo(() => buildTimeline(result, { debts: [...SAMPLE_NAMES.debts], goals: [...SAMPLE_NAMES.goals] }), [result]);

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
        <TrialCta headline="Now make it yours" body="Enter your income, your debts and your goals. It takes about three minutes to see your own 10-year number." secondary={null} from="demo" source="demo" />
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Estimates based on a made-up plan and assumed returns, not financial advice.
      </Typography>
    </>
  );
}
