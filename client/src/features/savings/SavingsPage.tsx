import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Snackbar,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import mascot from '../../assets/mascot.png';
import { Figure } from '../../components/Figure';
import { PageHeader } from '../../components/PageHeader';
import { SavingsHint } from '../hints/PageHints';
import { PlanAmountBanner } from '../../components/PlanAmountBanner';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney, formatPercent } from '../../lib/money';
import type { FreedMoneyDestination, ProjectionInput } from '../../lib/projection';
import { goalRollovers } from '../../lib/rollover';
import { RolloverList } from '../../components/RolloverList';
import { useNetWorth } from '../dashboard/networth';
import { buildProjectionInput, useDashboardData } from '../dashboard/useDashboard';
import { GoalDialog } from './GoalDialog';
import { GoalList } from './GoalList';
import { SavingsTimeline } from './SavingsTimeline';
import {
  splitModeInfo,
  useDeleteGoal,
  useReorderGoals,
  useSavings,
  useSavingsProjection,
  useSetSplitMode,
  type Goal,
  type GoalFields,
  type SavingsData,
  type SavingsSplitMode,
} from './savings';

const SUBTITLE = 'Turn your Savings allocation into finished goals.';

export function SavingsPage() {
  const { data, isPending, isError, error, refetch } = useSavings();
  // The rest of the plan, so this page projects exactly what the dashboard does. If it fails to load,
  // the page still works, projecting this module alone.
  const whole = useDashboardData();
  const wholeInput = useMemo(
    () => (whole.data && data ? buildProjectionInput({ ...whole.data, savings: data }, false) : undefined),
    [whole.data, data],
  );

  if (isPending || whole.isPending) {
    return (
      <>
        <PageHeader title="Savings" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Savings" subtitle={SUBTITLE} />
        <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <SavingsModule data={data} whole={wholeInput} />;
}

type Editing = { goal?: Goal; starter?: Partial<GoalFields> } | null;

function SavingsModule({ data, whole }: { data: SavingsData; whole?: ProjectionInput }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const projection = useSavingsProjection(data, whole);

  // Where the money goes once every goal is full is the user's own setting (Dashboard > Assumptions).
  const { data: netWorth } = useNetWorth();
  const doneDestination = (netWorth?.settings.savingsDoneDestination ?? 'Investments').toLowerCase() as FreedMoneyDestination;
  const rollovers = useMemo(
    () => goalRollovers(projection.result, data.splitMode === 'Percent' ? 'percent' : 'priority', doneDestination),
    [projection.result, data.splitMode, doneDestination],
  );

  const setSplitMode = useSetSplitMode();
  const reorder = useReorderGoals();
  const remove = useDeleteGoal();

  const [tab, setTab] = useState<'overview' | 'timeline'>('overview');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (e: unknown) => setProblem(errorMessage(e));

  const hasGoals = data.goals.length > 0;
  const percentMode = data.splitMode === 'Percent';
  const { totalSaved, totalTarget, allFullMonth } = projection;

  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} disabled={readOnly} onClick={() => setEditing({})}>
      Add a goal
    </Button>
  );

  return (
    <>
      <PageHeader title="Savings" subtitle={SUBTITLE} actions={hasGoals ? addButton : undefined} />
      <SavingsHint />
      <PlanAmountBanner amount={data.monthlyAmount} kind="Savings" />

      {!hasGoals ? (
        <EmergencyFundStarter plannedExpenses={data.plannedExpenses} readOnly={readOnly} onStart={(starter) => setEditing({ starter })} addButton={addButton} />
      ) : (
        <>
          {data.monthlyAmount <= 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Your plan doesn't set anything aside for Savings yet, so these goals won't grow. Give Savings an amount in Plan.
            </Alert>
          )}
          {percentMode && projection.sharesTotal > 0 && Math.abs(projection.sharesTotal - 100) > 0.01 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Your unfinished goals' shares add up to {Number(projection.sharesTotal.toFixed(2))}%, not 100%. They're scaled to use the whole monthly amount.
            </Alert>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'grid', gap: { xs: 2, md: 4 }, alignItems: 'start', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              <Figure label="Saved so far" value={formatMoney(totalSaved)} color="success.main" />
              <Figure label="Total of your goals" value={formatMoney(totalTarget)} />
              <Figure label="Progress" value={formatPercent(Math.min(totalSaved, totalTarget), totalTarget)} note={`${formatMoney(Math.max(0, totalTarget - totalSaved))} to go.`} />
              <Figure
                label="All goals reached"
                value={allFullMonth === null ? 'Not yet' : allFullMonth === 0 ? 'Now' : formatMonthFromNow(allFullMonth)}
                color={allFullMonth === null ? 'warning.main' : 'text.primary'}
                note={allFullMonth === null ? 'Not within 40 years at this pace.' : allFullMonth === 0 ? undefined : `In ${formatDuration(allFullMonth)}.`}
              />
            </CardContent>
          </Card>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab value="overview" label="Overview" />
            <Tab value="timeline" label="Timeline" />
          </Tabs>

          <Card>
            <CardContent>
              {tab === 'overview' ? (
                <>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Your goals
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={data.splitMode}
                    disabled={readOnly}
                    onChange={(_, value: SavingsSplitMode | null) => value && setSplitMode.mutate(value, { onError })}
                    aria-label="How to split monthly savings"
                  >
                    {(Object.keys(splitModeInfo) as SavingsSplitMode[]).map((mode) => (
                      <ToggleButton key={mode} value={mode} sx={{ px: 2 }}>
                        {splitModeInfo[mode].label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    {splitModeInfo[data.splitMode].description}
                  </Typography>

                  <GoalList
                    goals={data.goals}
                    outlooks={projection.outlooks}
                    showShares={percentMode}
                    readOnly={readOnly}
                    onReorder={(ids) => reorder.mutate(ids, { onError })}
                    onEdit={(goal) => setEditing({ goal })}
                    onDelete={setDeleting}
                  />

                  <RolloverList title="When a goal is full" rollovers={rollovers} names={data.goals.map((g) => g.name)} doneWord="full" groupNoun="goals" />
                </>
              ) : (
                <>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    When each goal is reached
                  </Typography>
                  <SavingsTimeline goals={data.goals} projection={projection} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <GoalDialog open={editing !== null} goal={editing?.goal} starter={editing?.starter} showShare={percentMode} onClose={() => setEditing(null)} />

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This removes the goal and its balance from your savings and your net worth. You can add it again later.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onError, onSettled: () => setDeleting(null) })}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!problem} autoHideDuration={8000} onClose={() => setProblem(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      </Snackbar>
    </>
  );
}

/** First visit: suggest an emergency fund sized from the plan's own expenses. */
function EmergencyFundStarter({
  plannedExpenses,
  readOnly,
  onStart,
  addButton,
}: {
  plannedExpenses: number;
  readOnly: boolean;
  onStart: (starter: Partial<GoalFields>) => void;
  addButton: ReactNode;
}) {
  const sizes = [3, 6];

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 3, md: 4 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 120, height: 'auto', flexShrink: 0 }} />
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Start with an emergency fund
          </Typography>
          {plannedExpenses > 0 ? (
            <>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
                Your plan has {formatMoney(plannedExpenses)} of expenses a month. A common first goal is enough to cover 3 to 6 months of them.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                {sizes.map((months) => (
                  <Button
                    key={months}
                    variant="contained"
                    disabled={readOnly}
                    onClick={() => onStart({ name: 'Emergency fund', targetAmount: plannedExpenses * months })}
                  >
                    {months} months · {formatMoney(plannedExpenses * months)}
                  </Button>
                ))}
                <Button disabled={readOnly} onClick={() => onStart({})}>
                  Add a different goal
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
                A common first goal is 3 to 6 months of expenses. Add your expenses as categories in{' '}
                <Link component={RouterLink} to="/plan">
                  Plan
                </Link>{' '}
                and we'll work out the amount, or add any goal now.
              </Typography>
              {addButton}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
