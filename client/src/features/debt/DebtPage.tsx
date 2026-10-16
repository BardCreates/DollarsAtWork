import { useMemo, useState } from 'react';
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
import { DebtHint } from '../hints/PageHints';
import { PlanAmountBanner } from '../../components/PlanAmountBanner';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { FreedMoneyDestination, ProjectionInput } from '../../lib/projection';
import { debtRollovers } from '../../lib/rollover';
import { RolloverList } from '../../components/RolloverList';
import { useNetWorth } from '../dashboard/networth';
import { buildProjectionInput, useDashboardData } from '../dashboard/useDashboard';
import { DebtBalanceChart } from './DebtBalanceChart';
import { DebtDialog } from './DebtDialog';
import { DebtList } from './DebtList';
import { DebtSchedule } from './DebtSchedule';
import {
  strategyInfo,
  useDebtProjection,
  useDebts,
  useDeleteDebt,
  useReorderDebts,
  useSetDebtStrategy,
  type Debt,
  type DebtProjection,
  type DebtStrategy,
  type DebtsData,
} from './debts';

const SUBTITLE = 'Use your Debt allocation to pay everything off faster.';

export function DebtPage() {
  const { data, isPending, isError, error, refetch } = useDebts();
  // The rest of the plan, so this page projects exactly what the dashboard does. If it fails to load,
  // the page still works, projecting this module alone.
  const whole = useDashboardData();
  const wholeInput = useMemo(
    () => (whole.data && data ? buildProjectionInput({ ...whole.data, debts: data }, false) : undefined),
    [whole.data, data],
  );

  if (isPending || whole.isPending) {
    return (
      <>
        <PageHeader title="Debt" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Debt" subtitle={SUBTITLE} />
        <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <DebtModule data={data} whole={wholeInput} />;
}

function DebtModule({ data, whole }: { data: DebtsData; whole?: ProjectionInput }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const projection = useDebtProjection(data, whole);

  // Where the money goes once every debt is gone is the user's own setting (Dashboard > Assumptions).
  const { data: netWorth } = useNetWorth();
  const doneDestination = (netWorth?.settings.debtDoneDestination ?? 'Investments').toLowerCase() as FreedMoneyDestination;
  const rollovers = useMemo(
    () => debtRollovers(projection.planned, data.debts.map((d) => d.minPayment), doneDestination),
    [projection.planned, data.debts, doneDestination],
  );

  const setStrategy = useSetDebtStrategy();
  const reorder = useReorderDebts();
  const remove = useDeleteDebt();

  const [tab, setTab] = useState<'overview' | 'schedule'>('overview');
  const [editing, setEditing] = useState<Debt | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (e: unknown) => setProblem(errorMessage(e));

  const hasDebts = data.debts.length > 0;
  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} disabled={readOnly} onClick={() => setEditing('new')}>
      Add a debt
    </Button>
  );

  return (
    <>
      <PageHeader title="Debt" subtitle={SUBTITLE} actions={hasDebts ? addButton : undefined} />
      <DebtHint />
      <PlanAmountBanner amount={data.monthlyBudget} />

      {!hasDebts ? (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 3, md: 4 } }}>
            <Box component="img" src={mascot} alt="" sx={{ width: 120, height: 'auto', flexShrink: 0 }} />
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                No debts. Nice.
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
                Owe something? Add cards, loans or a mortgage and see the date you'll be debt-free and what it will cost in interest.
              </Typography>
              {addButton}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          {projection.planned.warnings.debtBudgetBelowMinimums && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Your plan gives Debt {formatMoney(data.monthlyBudget)} a month, but your minimum payments add up to {formatMoney(projection.minimumsDue)}.
              Raise the Debt amount in Plan to cover them.
            </Alert>
          )}
          {projection.planned.warnings.debtGrowing && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              At least one debt is getting less each month than the interest it charges, so it grows instead of shrinking. Check its minimum
              payment, or give Debt more in Plan.
            </Alert>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'grid', gap: { xs: 2, md: 4 }, alignItems: 'start', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              <Summary projection={projection} />
            </CardContent>
          </Card>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab value="overview" label="Overview" />
            <Tab value="schedule" label="Schedule" />
          </Tabs>

          {tab === 'overview' ? (
            <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.2fr) minmax(0, 1fr)' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Your debts
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={data.strategy}
                    disabled={readOnly}
                    onChange={(_, value: DebtStrategy | null) => value && setStrategy.mutate(value, { onError })}
                    aria-label="Payoff strategy"
                  >
                    {(Object.keys(strategyInfo) as DebtStrategy[]).map((strategy) => (
                      <ToggleButton key={strategy} value={strategy} sx={{ px: 2 }}>
                        {strategyInfo[strategy].label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    {strategyInfo[data.strategy].description}
                  </Typography>

                  <DebtList
                    debts={data.debts}
                    planned={projection.planned}
                    canReorder={data.strategy === 'Custom'}
                    readOnly={readOnly}
                    onReorder={(ids) => reorder.mutate(ids, { onError })}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />

                  <RolloverList title="When a debt is paid off" rollovers={rollovers} names={data.debts.map((d) => d.name)} doneWord="paid off" groupNoun="debts" />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Balance over time
                  </Typography>
                  <DebtBalanceChart debts={data.debts} planned={projection.planned} />
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Card>
              <CardContent>
                <DebtSchedule debts={data.debts} planned={projection.planned} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <DebtDialog open={editing !== null} debt={editing === 'new' || editing === null ? undefined : editing} onClose={() => setEditing(null)} />

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This removes it from your payoff plan and your net worth. You can add it again later.</DialogContentText>
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

function Summary({ projection }: { projection: DebtProjection }) {
  const { planned, minimumsOnly, totalDebt } = projection;
  const debtFree = planned.debtFreeMonth;

  let comparison: { value: string; note: string };
  if (debtFree === null) {
    comparison = { value: '—', note: 'Raise your Debt amount to see what you save.' };
  } else if (minimumsOnly.debtFreeMonth === null) {
    comparison = { value: 'Decades', note: 'Minimums alone would not clear this within 40 years.' };
  } else {
    const saved = Math.max(0, minimumsOnly.totalInterest - planned.totalInterest);
    const sooner = minimumsOnly.debtFreeMonth - debtFree;
    comparison = {
      value: formatMoney(saved),
      note: sooner > 0 ? `Less interest, and done ${formatDuration(sooner)} sooner.` : 'Less interest than paying minimums only.',
    };
  }

  return (
    <>
      <Figure label="Total debt" value={formatMoney(totalDebt)} color={totalDebt > 0 ? 'error.main' : 'text.primary'} />
      <Figure
        label="Debt-free"
        value={totalDebt <= 0 ? 'Now' : debtFree === null ? 'Not yet' : formatMonthFromNow(debtFree)}
        color={debtFree === null ? 'warning.main' : 'success.main'}
        note={totalDebt <= 0 ? undefined : debtFree === null ? 'Not within 40 years at this pace.' : `In ${formatDuration(debtFree)}.`}
      />
      <Figure
        label="Interest you'll pay"
        value={formatMoney(planned.totalInterest)}
        note={debtFree === null ? 'Over the next 40 years.' : undefined}
      />
      <Figure label="Saved vs minimums only" value={comparison.value} note={comparison.note} />
    </>
  );
}
