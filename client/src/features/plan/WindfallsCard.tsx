import { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { errorMessage } from '../../api/client';
import { formatDuration, formatYearMonth, monthsUntilYearMonth } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { comparePlans, IMPACT_YEARS, type PlanImpact } from '../../lib/planImpact';
import { project } from '../../lib/projection';
import { useDeleteWindfall, windfallDestinationLabels, type Windfall } from '../dashboard/networth';
import { buildProjectionInput, useDashboardData } from '../dashboard/useDashboard';
import { WindfallDialog } from './WindfallDialog';

const whole = (value: number) => formatMoney(Math.round(value));

/** What each upcoming windfall does, compared with the same plan without it. */
function useWindfallImpacts(): Map<string, PlanImpact> {
  const { data } = useDashboardData();
  return useMemo(() => {
    const impacts = new Map<string, PlanImpact>();
    if (!data) return impacts;
    const input = buildProjectionInput(data, false);
    const withAll = project(input);
    for (const windfall of input.windfalls ?? []) {
      const without = project({ ...input, windfalls: (input.windfalls ?? []).filter((w) => w.id !== windfall.id) });
      impacts.set(windfall.id, comparePlans(without, withAll, IMPACT_YEARS));
    }
    return impacts;
  }, [data]);
}

function impactText(windfall: Windfall, impact: PlanImpact | undefined): string | null {
  if (!impact) return null;
  const sooner = impact.debtFree.monthsSooner;
  if (windfall.destination === 'Debt' && sooner !== null && sooner > 0) return `Debt-free ${formatDuration(sooner)} sooner`;
  if (Math.round(impact.netWorth.change) > 0) return `+${whole(impact.netWorth.change)} net worth in ${IMPACT_YEARS} years`;
  return null;
}

/**
 * One-time money on Plan: a tax refund, a bonus, something sold. Each upcoming one shows what it does to the
 * debt-free date or the 10-year net worth, read from the same projection as the dashboard.
 */
export function WindfallsCard({ windfalls, readOnly }: { windfalls: Windfall[]; readOnly: boolean }) {
  const impacts = useWindfallImpacts();
  const remove = useDeleteWindfall();
  const [editing, setEditing] = useState<Windfall | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Windfall | null>(null);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="h6">One-time money</Typography>
          <Button size="small" startIcon={<AddIcon />} disabled={readOnly} onClick={() => setEditing('new')}>
            Add
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A tax refund, a bonus, something you're selling. Give it a job ahead of time and see what it does.
        </Typography>

        {windfalls.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nothing planned yet.
          </Typography>
        ) : (
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {windfalls.map((windfall) => {
              const passed = (monthsUntilYearMonth(windfall.month) ?? 0) < 0;
              const effect = passed ? null : impactText(windfall, impacts.get(windfall.id));
              return (
                <Box
                  key={windfall.id}
                  sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 1, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {windfall.name} · {formatMoney(windfall.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {passed ? `Arrived ${formatYearMonth(windfall.month)}, no longer projected` : `${formatYearMonth(windfall.month)} → ${windfallDestinationLabels[windfall.destination]}`}
                    </Typography>
                    {effect && (
                      <Typography variant="caption" color="success.main" component="div">
                        {effect}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <Tooltip title="Edit">
                      <span>
                        <IconButton size="small" aria-label={`Edit ${windfall.name}`} disabled={readOnly} onClick={() => setEditing(windfall)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton size="small" aria-label={`Delete ${windfall.name}`} disabled={readOnly} onClick={() => setDeleting(windfall)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        {remove.isError && (
          <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
            {errorMessage(remove.error)}
          </Typography>
        )}
      </CardContent>

      <WindfallDialog open={editing !== null} windfall={editing === 'new' || editing === null ? undefined : editing} onClose={() => setEditing(null)} />
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">It comes out of every projection.</Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
