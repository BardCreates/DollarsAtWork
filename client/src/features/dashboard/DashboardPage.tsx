import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Alert, Box, Button, Card, CardContent, CircularProgress, FormControlLabel, Snackbar, Switch, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import mascot from '../../assets/mascot.png';
import { PageHeader } from '../../components/PageHeader';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { brand } from '../../theme';
import { planTotals } from '../plan/plan';
import { AssumptionsDialog } from './AssumptionsDialog';
import { AssetsLiabilitiesCard, CheckInCard, DashCard, DebtPayoffCard, GoalsCard, HistoryCard, MilestonesCard, PlanCard } from './cards';
import { CheckInDialog } from './CheckInDialog';
import { NetWorthCard } from './NetWorthCard';
import type { NetWorthData } from './networth';
import { OtherItemsDialog } from './OtherItemsDialog';
import { ProjectionChart } from './ProjectionChart';
import { useDashboardData, useDashboardProjection, type DashboardData } from './useDashboard';

const DISCLAIMER = 'Estimates based on your plan and assumed returns, not financial advice.';

export function DashboardPage() {
  const { data, isPending, error, refetch } = useDashboardData();

  if (isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Alert severity="error" action={<Button color="inherit" onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <Dashboard data={data} />;
}

/** Nothing entered anywhere yet: point the way instead of showing a wall of zeros. */
function isBlank(data: DashboardData): boolean {
  return (
    data.plan.monthlyIncome === 0 &&
    data.plan.categories.every((c) => c.amount === 0) &&
    data.savings.goals.length === 0 &&
    data.debts.debts.length === 0 &&
    data.investments.accounts.length === 0 &&
    data.netWorth.items.length === 0
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;

  const [year, setYear] = useState(10);
  const [todaysDollars, setTodaysDollars] = useState(false);
  const [dialog, setDialog] = useState<'assumptions' | 'items' | 'check-in' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { result, milestones } = useDashboardProjection(data, todaysDollars);
  const { remaining } = planTotals(data.plan);

  if (isBlank(data)) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={me ? `Welcome, ${me.email}` : undefined} />
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4, p: { xs: 3, md: 5 } }}>
            <Box component="img" src={mascot} alt="" sx={{ width: 160, height: 'auto' }} />
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Let's put your dollars to work
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
                Your net worth, the years slider and the charts appear here once your plan is set up. Start by entering your monthly income and splitting
                it into categories.
              </Typography>
              <Button component={RouterLink} to="/welcome" variant="contained" size="large">
                Set up your plan
              </Button>
            </Box>
          </CardContent>
        </Card>
      </>
    );
  }

  const checkInSaved = (saved: NetWorthData) => {
    setDialog(null);
    const latest = saved.snapshots.at(-1);
    setNotice(latest ? `Check-in saved. Your net worth is ${formatMoney(Math.round(latest.netWorth))}.` : 'Check-in saved.');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors: [brand.green, brand.yellow, brand.pink, brand.blue] });
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Where you stand today, and where your plan takes you."
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={todaysDollars} onChange={(_, checked) => setTodaysDollars(checked)} />}
              label="Today's dollars"
              sx={{ mr: 1 }}
            />
            <Button variant="outlined" startIcon={<TuneIcon />} disabled={readOnly} onClick={() => setDialog('assumptions')}>
              Assumptions
            </Button>
          </Box>
        }
      />

      {remaining < 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button component={RouterLink} to="/plan" color="inherit" size="small">
              Fix in Plan
            </Button>
          }
        >
          Your plan is over-allocated by {formatMoney(-remaining)}: your categories add up to more than your income, so these projections are optimistic.
        </Alert>
      )}
      {result.warnings.debtBudgetBelowMinimums && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your Debt amount doesn't cover your minimum payments. Raise it in Plan.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
        <Box sx={{ display: 'grid', gap: 3, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <NetWorthCard result={result} year={year} onYearChange={setYear} todaysDollars={todaysDollars} />
          <DashCard title="Projection">
            <ProjectionChart result={result} year={year} />
            {result.warnings.investingWithoutAccounts && (
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                Money headed for investments is shown growing at 7% a year because you haven't added an investment account yet.
              </Typography>
            )}
          </DashCard>
          <AssetsLiabilitiesCard data={data} readOnly={readOnly} onManage={() => setDialog('items')} />
          <HistoryCard snapshots={data.netWorth.snapshots} />
        </Box>

        <Box sx={{ display: 'grid', gap: 3, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <CheckInCard snapshots={data.netWorth.snapshots} readOnly={readOnly} onStart={() => setDialog('check-in')} />
          <MilestonesCard milestones={milestones} />
          <PlanCard data={data} />
          <DebtPayoffCard data={data} result={result} />
          <GoalsCard data={data} result={result} />
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        {DISCLAIMER}
      </Typography>

      <AssumptionsDialog open={dialog === 'assumptions'} settings={data.netWorth.settings} onClose={() => setDialog(null)} />
      <OtherItemsDialog open={dialog === 'items'} items={data.netWorth.items} onClose={() => setDialog(null)} />
      <CheckInDialog open={dialog === 'check-in'} data={data} onClose={() => setDialog(null)} onSaved={checkInSaved} />

      <Snackbar open={!!notice} autoHideDuration={8000} onClose={() => setNotice(null)} message={notice ?? ''} />
    </>
  );
}
