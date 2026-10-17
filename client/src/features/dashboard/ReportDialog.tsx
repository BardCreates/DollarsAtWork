import { useMemo } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { project } from '../../lib/projection';
import { buildReport, isImprovement, type ReportArea } from '../../lib/report';
import { buildTimeline, nextUp } from '../../lib/timeline';
import { useEmailReport } from './networth';
import { buildProjectionInput, outlookForEmail, outlookOf, type DashboardData } from './useDashboard';

const whole = (value: number) => formatMoney(Math.round(value));
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateOnly = (iso: string) => monthName.format(new Date(`${iso}T00:00:00Z`));

/** "+$500" or "−$800", or "No change". */
function signed(change: number): string {
  const rounded = Math.round(change);
  if (rounded === 0) return 'No change';
  return `${rounded > 0 ? '+' : '−'}${whole(Math.abs(rounded))}`;
}

function AreaRow({ area }: { area: ReportArea }) {
  const better = isImprovement(area);
  const color = better === null ? 'text.secondary' : better ? 'success.main' : 'error.main';
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Typography>{area.label}</Typography>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{whole(area.value)}</Typography>
        {area.change !== null && (
          <Typography variant="caption" color={color} sx={{ fontWeight: better === null ? 400 : 600 }}>
            {area.key === 'debts' && area.change < -0.5 ? `Paid down ${whole(-area.change)}` : signed(area.change)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/**
 * The one-screen recap shown after a monthly check-in: net worth and how it moved, each area, and where the plan
 * is headed from the balances just confirmed. Can be emailed to the signed-in user's own address.
 */
export function ReportDialog({ open, data, onClose }: { open: boolean; data: DashboardData; onClose: () => void }) {
  const { data: me } = useMe();
  const email = useEmailReport();

  const report = useMemo(() => buildReport(data.netWorth.snapshots), [data.netWorth.snapshots]);

  // Always in actual dollars, so the screen and the emailed copy agree whatever the dashboard's toggle says.
  const outlook = useMemo(() => {
    if (!open) return null;
    const result = project(buildProjectionInput(data, false));
    const timeline = buildTimeline(result, {
      debts: data.debts.debts.map((d) => d.name),
      goals: data.savings.goals.map((g) => g.name),
      minimumOnly: data.debts.debts.map((d) => d.minimumOnly),
    });
    return { ...outlookOf(result), next: nextUp(timeline) };
  }, [open, data]);

  if (!report) return null;

  const sendCopy = () => email.mutate(outlook ? outlookForEmail(outlook) : { debtFreeMonth: null, debtFreeOn: null, netWorthIn10Years: null });

  const up = report.change !== null && report.change > 0.5;
  const down = report.change !== null && report.change < -0.5;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 44, height: 'auto', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {dateOnly(report.date)} check-in
          </Typography>
          <Typography variant="h6" component="span">
            {report.isFirst ? "You're on the map" : up ? 'Nice month' : down ? 'A bumpy month' : 'Holding steady'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Net worth
        </Typography>
        <Typography variant="h4" component="p" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: report.netWorth < 0 ? 'error.main' : 'text.primary' }}>
          {whole(report.netWorth)}
        </Typography>
        <Typography color={up ? 'success.main' : down ? 'error.main' : 'text.secondary'} sx={{ mb: 2, fontWeight: report.change === null ? 400 : 600 }}>
          {report.isFirst || report.change === null || report.previousDate === null
            ? "This is your starting point. Next month you'll see how far you've come."
            : `${signed(report.change)} since ${dateOnly(report.previousDate)}`}
        </Typography>

        {report.areas.length > 0 && <Box sx={{ mb: 2.5 }}>{report.areas.map((area) => <AreaRow key={area.key} area={area} />)}</Box>}

        {outlook && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Where you're headed
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.25, display: 'grid', gap: 0.75 }}>
              {outlook.hasDebt && (
                <li>
                  <Typography variant="body2">
                    {outlook.debtFreeMonth === null
                      ? 'Debt-free: not within 40 years at this pace.'
                      : `Debt-free: ${formatMonthFromNow(outlook.debtFreeMonth)}, in ${formatDuration(outlook.debtFreeMonth)}.`}
                  </Typography>
                </li>
              )}
              <li>
                <Typography variant="body2">Net worth in 10 years: about {whole(outlook.netWorthIn10Years)}.</Typography>
              </li>
              {outlook.next && outlook.next.month !== null && (
                <li>
                  <Typography variant="body2">
                    Next up: {outlook.next.label}, {outlook.next.month === 1 ? 'next month' : `in ${formatDuration(outlook.next.month)}`}.
                  </Typography>
                </li>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              Estimates based on your plan and assumed returns, not financial advice.
            </Typography>
          </>
        )}

        {email.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(email.error)}
          </Alert>
        )}
        {email.isSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Sent to {me?.email ?? 'your email'}.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={sendCopy} disabled={email.isPending || email.isSuccess}>
          {email.isSuccess ? 'Copy sent' : email.isPending ? 'Sending…' : 'Email me a copy'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
