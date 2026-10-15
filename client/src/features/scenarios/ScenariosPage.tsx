import { useState } from 'react';
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
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import mascot from '../../assets/mascot.png';
import { PageHeader } from '../../components/PageHeader';
import { WhatIfHint } from '../hints/PageHints';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { resolveScenario, type ScenarioChanges, type ScenarioInputs } from '../../lib/scenarios';
import { useDashboardData, type DashboardData } from '../dashboard/useDashboard';
import { CompareView } from './CompareView';
import { ScenarioDialog } from './ScenarioDialog';
import { baseInputs, MAX_SCENARIOS, useComparison, useDeleteScenario, useScenarios, type Scenario } from './scenarios';

const SUBTITLE = "Try a different plan and see where it takes you, without touching your real one.";

const destinationWords: Record<string, string> = {
  Investments: 'investments',
  Savings: 'savings goals',
  Debt: 'debt payoff',
  Remaining: 'Remaining',
};

/** What a scenario changes, in short phrases, compared with the real plan as it is today. */
function describeChanges(base: ScenarioInputs, changes: ScenarioChanges, data: DashboardData): string[] {
  const resolved = resolveScenario(base, changes);
  const phrases: string[] = [];

  if (changes.monthlyIncome != null) phrases.push(`Income ${formatMoney(resolved.monthlyIncome)} (was ${formatMoney(base.monthlyIncome)})`);
  for (const category of data.plan.categories) {
    if (changes.categoryAmounts?.[category.id] != null) {
      phrases.push(`${category.name} ${formatMoney(resolved.categoryAmounts[category.id])} (was ${formatMoney(base.categoryAmounts[category.id])})`);
    }
  }
  if (changes.incomeGrowthRate != null) phrases.push(`Yearly raise ${resolved.incomeGrowthRate}%`);
  if (changes.debtStrategy != null) phrases.push(`${resolved.debtStrategy} payoff`);
  if (changes.debtDoneDestination != null) phrases.push(`After debt: ${destinationWords[resolved.debtDoneDestination] ?? resolved.debtDoneDestination}`);
  if (changes.savingsDoneDestination != null) phrases.push(`After goals: ${destinationWords[resolved.savingsDoneDestination] ?? resolved.savingsDoneDestination}`);
  return phrases;
}

export function ScenariosPage() {
  const dashboard = useDashboardData();
  const scenarios = useScenarios();

  if (dashboard.isPending || scenarios.isPending) {
    return (
      <>
        <PageHeader title="What if" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!dashboard.data || scenarios.isError) {
    return (
      <>
        <PageHeader title="What if" subtitle={SUBTITLE} />
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => {
                dashboard.refetch();
                scenarios.refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          {errorMessage(dashboard.error ?? scenarios.error)}
        </Alert>
      </>
    );
  }

  return <ScenariosView data={dashboard.data} scenarios={scenarios.data ?? []} />;
}

function ScenariosView({ data, scenarios }: { data: DashboardData; scenarios: Scenario[] }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const compared = useComparison(data, scenarios);
  const remove = useDeleteScenario();

  const [editing, setEditing] = useState<Scenario | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Scenario | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const full = scenarios.length >= MAX_SCENARIOS;
  const base = baseInputs(data);

  const newButton = (
    <Tooltip title={full ? `You can keep up to ${MAX_SCENARIOS}. Delete one to make room.` : ''}>
      <span>
        <Button variant="contained" startIcon={<AddIcon />} disabled={readOnly || full} onClick={() => setEditing('new')}>
          New what-if
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <>
      <PageHeader title="What if" subtitle={SUBTITLE} actions={scenarios.length > 0 ? newButton : undefined} />
      <WhatIfHint />

      {scenarios.length === 0 ? (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 3, md: 4 } }}>
            <Box component="img" src={mascot} alt="" sx={{ width: 120, height: 'auto', flexShrink: 0 }} />
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Try a what-if
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
                What if you cut dining out? Got a raise? Put everything toward the card with the highest rate? Save up to {MAX_SCENARIOS} versions of your plan and
                compare them side by side: your debt-free date, your net worth in 10, 20 and 30 years, and the interest you'd pay.
              </Typography>
              {newButton}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          <CompareView plans={compared} />

          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
            Your what-ifs
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } }}>
            {scenarios.map((scenario) => {
              const phrases = describeChanges(base, scenario.overrides, data);
              return (
                <Card key={scenario.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                        {scenario.name}
                      </Typography>
                      <Tooltip title="Edit">
                        <span>
                          <IconButton size="small" aria-label={`Edit ${scenario.name}`} disabled={readOnly} onClick={() => setEditing(scenario)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton size="small" aria-label={`Delete ${scenario.name}`} disabled={readOnly} onClick={() => setDeleting(scenario)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    {phrases.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Same as your current plan.
                      </Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.25, color: 'text.secondary' }}>
                        {phrases.map((phrase) => (
                          <li key={phrase}>
                            <Typography variant="body2">{phrase}</Typography>
                          </li>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <ScenarioDialog open={editing !== null} scenario={editing === 'new' || editing === null ? undefined : editing} data={data} onClose={() => setEditing(null)} />

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This only removes the what-if. Your real plan isn't affected.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onError: (e) => setProblem(errorMessage(e)), onSettled: () => setDeleting(null) })}
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
