import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import { brand, chartPalette } from '../../theme';
import type { ComparedPlan } from './scenarios';

const whole = (value: number) => formatMoney(Math.round(value));
const seriesColor = (index: number) => (index === 0 ? brand.green : chartPalette[index % chartPalette.length]);

type Tone = 'good' | 'bad' | 'none';
/** The label column stays put while the plan columns scroll sideways on a phone. */
const pinned = { position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 } as const;

const toneColor: Record<Tone, string> = { good: 'success.main', bad: 'error.main', none: 'text.secondary' };

/** How a number compares with the current plan's. `higherIsBetter` flips for things like interest paid. */
function delta(value: number, current: number, higherIsBetter: boolean, format: (n: number) => string): { text: string; tone: Tone } {
  const diff = Math.round(value - current);
  if (diff === 0) return { text: 'Same', tone: 'none' };
  const good = higherIsBetter ? diff > 0 : diff < 0;
  return { text: `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}`, tone: good ? 'good' : 'bad' };
}

function debtFreeCell(plan: ComparedPlan, current: ComparedPlan): { value: string; change: string; tone: Tone } {
  const { debtFreeMonth, hasDebt } = plan.metrics;
  const value = !hasDebt ? 'No debt' : debtFreeMonth === null ? 'Not within 40 years' : formatMonthFromNow(debtFreeMonth);
  if (plan.isCurrent || !hasDebt) return { value, change: '', tone: 'none' };

  const before = current.metrics.debtFreeMonth;
  if (before === null && debtFreeMonth !== null) return { value, change: 'Now gets paid off', tone: 'good' };
  if (before !== null && debtFreeMonth === null) return { value, change: 'No longer gets paid off', tone: 'bad' };
  if (before === null || debtFreeMonth === null) return { value, change: 'Same', tone: 'none' };
  const sooner = before - debtFreeMonth;
  if (sooner === 0) return { value, change: 'Same', tone: 'none' };
  return { value, change: `${formatDuration(Math.abs(sooner))} ${sooner > 0 ? 'sooner' : 'later'}`, tone: sooner > 0 ? 'good' : 'bad' };
}

/** The scenarios side by side: one chart of net worth over time, and the numbers that matter in a table. */
export function CompareView({ plans }: { plans: ComparedPlan[] }) {
  const theme = useTheme();
  const current = plans[0];
  const thisYear = new Date().getFullYear();

  const rows = current.netWorthByYear.map((_, year) => {
    const row: Record<string, number> = { year };
    plans.forEach((plan) => {
      row[plan.id] = plan.netWorthByYear[year];
    });
    return row;
  });

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Net worth over time</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
            In today's dollars, after inflation, like the Dashboard.
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={theme.palette.divider} vertical={false} />
                <XAxis
                  dataKey="year"
                  type="number"
                  domain={[0, 40]}
                  tickFormatter={(year: number) => String(thisYear + year)}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  stroke={theme.palette.divider}
                  tickCount={9}
                />
                <YAxis tickFormatter={(value: number) => formatMoneyCompact(value)} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} stroke={theme.palette.divider} width={64} />
                <Tooltip
                  labelFormatter={(year) => `${thisYear + Number(year)} (in ${year} ${Number(year) === 1 ? 'year' : 'years'})`}
                  formatter={(value) => whole(Number(value))}
                  contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
                  labelStyle={{ color: theme.palette.text.secondary }}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: theme.palette.text.secondary }} />
                {plans.map((plan, index) => (
                  <Line
                    key={plan.id}
                    type="monotone"
                    dataKey={plan.id}
                    name={plan.name}
                    stroke={seriesColor(index)}
                    strokeWidth={plan.isCurrent ? 3 : 2.25}
                    strokeDasharray={plan.isCurrent ? undefined : '6 4'}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Side by side
          </Typography>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 120 + plans.length * 150, '& td, & th': { fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={pinned} />
                  {plans.map((plan, index) => (
                    <TableCell key={plan.id} align="right">
                      <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: seriesColor(index), mr: 0.75 }} />
                      {plan.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row" sx={pinned}>
                    Debt-free
                  </TableCell>
                  {plans.map((plan) => {
                    const cell = debtFreeCell(plan, current);
                    return (
                      <TableCell key={plan.id} align="right">
                        <Box>{cell.value}</Box>
                        {cell.change && (
                          <Typography variant="caption" color={toneColor[cell.tone]} component="div">
                            {cell.change}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                {current.metrics.netWorth.map((point, i) => (
                  <TableRow key={point.years}>
                    <TableCell component="th" scope="row" sx={pinned}>
                      Net worth in {point.years} years
                    </TableCell>
                    {plans.map((plan) => {
                      const value = plan.metrics.netWorth[i].value;
                      const change = delta(value, point.value, true, whole);
                      return (
                        <TableCell key={plan.id} align="right">
                          <Box sx={{ fontWeight: plan.isCurrent ? 400 : 600 }}>{whole(value)}</Box>
                          {!plan.isCurrent && (
                            <Typography variant="caption" color={toneColor[change.tone]} component="div">
                              {change.text}
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                <TableRow>
                  <TableCell component="th" scope="row" sx={pinned}>
                    Interest paid
                  </TableCell>
                  {plans.map((plan) => {
                    const change = delta(plan.metrics.interestPaid, current.metrics.interestPaid, false, whole);
                    return (
                      <TableCell key={plan.id} align="right">
                        <Box>{plan.metrics.hasDebt ? whole(plan.metrics.interestPaid) : '—'}</Box>
                        {!plan.isCurrent && plan.metrics.hasDebt && (
                          <Typography variant="caption" color={toneColor[change.tone]} component="div">
                            {change.text}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
            Estimates based on your plan and assumed returns, not financial advice. Interest is what you'd pay from now until each plan's debts are gone.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
}
