import { useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import type { Debt } from './debts';
import { paymentsForMonth, type DebtPayment } from './paymentPlan';

/** When the debts are never cleared, list this many months instead of the whole 40 years. */
const OPEN_ENDED_MONTHS = 120;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const cents = (value: number) => formatMoney(value, { cents: true });

/** One short line under a debt's payment saying how it compares with the minimum. */
function paymentNote(line: DebtPayment): string {
  switch (line.kind) {
    case 'minimum':
      return 'Minimum';
    case 'extra':
      return `Minimum + ${cents(line.extra)} extra`;
    case 'last':
      return 'Last payment, then it’s paid off';
    case 'short':
      return `Below the ${cents(line.minimum)} minimum`;
    default:
      return 'Paid off';
  }
}

/** The first month of the schedule: what to send to each debt, so the plan can be followed payment by payment. */
function ThisMonth({ debts, planned }: { debts: Debt[]; planned: ProjectionResult }) {
  const lines = paymentsForMonth(planned, debts.map((d) => d.minPayment), 1).filter((line) => line.kind !== 'done');
  if (lines.length === 0) return null;
  const short = lines.some((line) => line.kind === 'short');
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6">Payments for {formatMonthFromNow(1)}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        What to send to each debt to stay on your plan.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1 }}>
        {lines.map((line) => {
          const debt = debts[line.index];
          return (
            <Box key={debt.id} sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap>{debt.name}</Typography>
                <Typography
                  variant="caption"
                  color={line.kind === 'short' ? 'warning.main' : line.kind === 'extra' || line.kind === 'last' ? 'success.main' : 'text.secondary'}
                >
                  {paymentNote(line)}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cents(line.payment)}</Typography>
            </Box>
          );
        })}
        <Divider />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography sx={{ flex: 1 }} color="text.secondary">
            Total
          </Typography>
          <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cents(sum(lines.map((l) => l.payment)))}</Typography>
        </Box>
      </Box>
      {short && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
          Your Debt amount doesn’t cover every minimum. Raise it above the total of the minimums to stay current.
        </Typography>
      )}
    </Box>
  );
}

/** Month by month: what is paid (to each debt, or in total), how much of it is interest, and what is still owed. */
export function DebtSchedule({ debts, planned }: { debts: Debt[]; planned: ProjectionResult }) {
  const [view, setView] = useState<'byDebt' | 'totals'>('byDebt');
  const lastMonth = Math.min(planned.debtFreeMonth ?? OPEN_ENDED_MONTHS, planned.points.length - 1);
  const months = planned.points.slice(1, lastMonth + 1);
  const minimums = debts.map((d) => d.minPayment);

  if (months.length === 0) {
    return <Typography color="text.secondary">Add a debt with a balance to see its payment schedule.</Typography>;
  }

  // Only debts with something owed at some point in the schedule get a column.
  const shown = debts
    .map((debt, index) => ({ debt, index }))
    .filter(({ index }) => (planned.points[0].debtBalances[index] ?? 0) > 0.005);

  return (
    <>
      <ThisMonth debts={debts} planned={planned} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
        <Typography variant="h6">Every month</Typography>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, value) => value && setView(value)}>
          <ToggleButton value="byDebt">By debt</ToggleButton>
          <ToggleButton value="totals">Totals</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer sx={{ maxHeight: 560 }}>
        {view === 'byDebt' ? (
          <Table stickyHeader size="small" sx={{ minWidth: 200 + shown.length * 120, '& td, & th': { fontVariantNumeric: 'tabular-nums' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                {shown.map(({ debt }) => (
                  <TableCell key={debt.id} align="right" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {debt.name}
                  </TableCell>
                ))}
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {months.map((point) => {
                const lines = paymentsForMonth(planned, minimums, point.month);
                return (
                  <TableRow key={point.month} hover>
                    <TableCell>{formatMonthFromNow(point.month)}</TableCell>
                    {shown.map(({ debt, index }) => {
                      const line = lines[index];
                      if (!line || line.kind === 'done') {
                        return (
                          <TableCell key={debt.id} align="right" sx={{ color: 'text.disabled' }}>
                            —
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell
                          key={debt.id}
                          align="right"
                          sx={{ color: line.kind === 'extra' || line.kind === 'last' ? 'success.main' : line.kind === 'short' ? 'warning.main' : undefined }}
                        >
                          {cents(line.payment)}
                          {line.kind === 'last' && (
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Paid off
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="right">{cents(sum(point.debtPayments))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table stickyHeader size="small" sx={{ minWidth: 520, '& td, & th': { fontVariantNumeric: 'tabular-nums' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Interest</TableCell>
                <TableCell align="right">Toward balance</TableCell>
                <TableCell align="right">Still owed</TableCell>
                <TableCell>Paid off</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {months.map((point) => {
                const paid = sum(point.debtPayments);
                const interest = sum(point.debtInterest);
                const cleared = debts.filter((_, index) => planned.debtPayoffMonths[index] === point.month);
                return (
                  <TableRow key={point.month} hover>
                    <TableCell>{formatMonthFromNow(point.month)}</TableCell>
                    <TableCell align="right">{cents(paid)}</TableCell>
                    <TableCell align="right">{cents(interest)}</TableCell>
                    <TableCell align="right">{cents(paid - interest)}</TableCell>
                    <TableCell align="right">{cents(point.debt)}</TableCell>
                    <TableCell>
                      {cleared.map((debt) => (
                        <Chip key={debt.id} size="small" color="success" label={debt.name} sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>
      {view === 'byDebt' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Green is where your extra money goes that month. Scroll sideways to see every debt.
        </Typography>
      )}
      {planned.debtFreeMonth === null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing the first 10 years. At this pace the debt isn't cleared within 40 years.
        </Typography>
      )}
    </>
  );
}
