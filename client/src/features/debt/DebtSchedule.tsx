import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import type { Debt } from './debts';

/** When the debts are never cleared, list this many months instead of the whole 40 years. */
const OPEN_ENDED_MONTHS = 120;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Month by month: what is paid, how much of it is interest, and what is still owed. */
export function DebtSchedule({ debts, planned }: { debts: Debt[]; planned: ProjectionResult }) {
  const lastMonth = Math.min(planned.debtFreeMonth ?? OPEN_ENDED_MONTHS, planned.points.length - 1);
  const months = planned.points.slice(1, lastMonth + 1);

  if (months.length === 0) {
    return <Typography color="text.secondary">Add a debt with a balance to see its payment schedule.</Typography>;
  }

  return (
    <>
      <TableContainer sx={{ maxHeight: 560 }}>
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
                  <TableCell align="right">{formatMoney(paid, { cents: true })}</TableCell>
                  <TableCell align="right">{formatMoney(interest, { cents: true })}</TableCell>
                  <TableCell align="right">{formatMoney(paid - interest, { cents: true })}</TableCell>
                  <TableCell align="right">{formatMoney(point.debt, { cents: true })}</TableCell>
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
      </TableContainer>
      {planned.debtFreeMonth === null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing the first 10 years. At this pace the debt isn't cleared within 40 years.
        </Typography>
      )}
    </>
  );
}
