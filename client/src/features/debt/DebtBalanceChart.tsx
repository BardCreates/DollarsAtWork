import { Box, useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoneyCompact, formatWholeMoney } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import { chartPalette } from '../../theme';
import type { Debt } from './debts';

/** When the debts are never cleared, show this many months instead of the whole 40 years. */
const OPEN_ENDED_MONTHS = 120;

/** Each debt's balance stacked over time, falling to $0 at the debt-free month. */
export function DebtBalanceChart({ debts, planned }: { debts: Debt[]; planned: ProjectionResult }) {
  const theme = useTheme();
  const lastMonth = Math.min(planned.debtFreeMonth ?? OPEN_ENDED_MONTHS, planned.points.length - 1);

  const rows = planned.points.slice(0, lastMonth + 1).map((point) => {
    const row: Record<string, number> = { month: point.month };
    debts.forEach((debt, index) => {
      row[debt.id] = point.debtBalances[index];
    });
    return row;
  });

  return (
    <Box sx={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, lastMonth]}
            tickFormatter={(month: number) => formatMonthFromNow(month)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            tickCount={5}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoneyCompact(value)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            width={56}
          />
          <Tooltip
            labelFormatter={(month) => formatMonthFromNow(Number(month))}
            formatter={(value) => formatWholeMoney(Number(value))}
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
            labelStyle={{ color: theme.palette.text.secondary }}
          />
          {debts.map((debt, index) => {
            const color = chartPalette[index % chartPalette.length];
            return <Area key={debt.id} type="monotone" dataKey={debt.id} name={debt.name} stackId="debt" stroke={color} fill={color} fillOpacity={0.35} />;
          })}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
