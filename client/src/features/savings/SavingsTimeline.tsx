import { Box, Typography, useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import { chartPalette } from '../../theme';
import type { Goal, SavingsProjection } from './savings';

/** When some goal is never reached, show this many months instead of the whole 40 years. */
const OPEN_ENDED_MONTHS = 120;

/** Each goal's balance stacked over time, with the dates they are reached listed underneath. */
export function SavingsTimeline({ goals, projection }: { goals: Goal[]; projection: SavingsProjection }) {
  const theme = useTheme();
  const { result, allFullMonth } = projection;
  // A little past the last goal, so the chart shows it levelling off.
  const lastMonth = Math.min(allFullMonth === null ? OPEN_ENDED_MONTHS : Math.max(12, allFullMonth + 3), result.points.length - 1);

  const rows = result.points.slice(0, lastMonth + 1).map((point) => {
    const row: Record<string, number> = { month: point.month };
    goals.forEach((goal, index) => {
      row[goal.id] = point.goalBalances[index];
    });
    return row;
  });

  const milestones = goals
    .map((goal, index) => ({ goal, month: result.goalFullMonths[index], color: chartPalette[index % chartPalette.length] }))
    .sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity));

  return (
    <>
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
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
              labelStyle={{ color: theme.palette.text.secondary }}
            />
            {goals.map((goal, index) => {
              const color = chartPalette[index % chartPalette.length];
              return <Area key={goal.id} type="monotone" dataKey={goal.id} name={goal.name} stackId="savings" stroke={color} fill={color} fillOpacity={0.35} />;
            })}
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 3, p: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.25 }}>
        {milestones.map(({ goal, month, color }) => (
          <Box component="li" key={goal.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
            <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
              {goal.name}
            </Typography>
            <Typography color={month === null ? 'warning.main' : 'text.primary'} sx={{ textAlign: 'right' }}>
              {month === null ? 'Not within 40 years' : month === 0 ? 'Done' : `${formatMonthFromNow(month)} · ${formatDuration(month)}`}
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );
}
