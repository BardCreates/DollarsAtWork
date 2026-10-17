import { Box, useTheme } from '@mui/material';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import { brand } from '../../theme';
import { DASHBOARD_YEARS } from './useDashboard';

const legendOrder = ['netWorth', 'savings', 'investments', 'other', 'debt'];

/** Savings and investments stacked above zero, debt below it, and the net-worth line on top. */
export function ProjectionChart({ result, year }: { result: ProjectionResult; year: number }) {
  const theme = useTheme();
  const thisYear = new Date().getFullYear();

  const rows = Array.from({ length: DASHBOARD_YEARS + 1 }, (_, y) => {
    const point = result.points[y * 12];
    return {
      year: y,
      savings: point.savings,
      investments: point.investments,
      other: point.otherAssets,
      debt: -(point.debt + point.otherLiabilities),
      netWorth: point.netWorth,
    };
  });
  const hasOther = rows.some((row) => row.other > 0);
  const hasDebt = rows.some((row) => row.debt < 0);

  return (
    <Box sx={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, DASHBOARD_YEARS]}
            tickFormatter={(y: number) => String(thisYear + y)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            tickCount={9}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoneyCompact(value)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            width={64}
            domain={[(lowest: number) => Math.min(0, lowest), 'auto']}
          />
          <Tooltip
            labelFormatter={(y) => `${thisYear + Number(y)} (in ${y} ${Number(y) === 1 ? 'year' : 'years'})`}
            formatter={(value) => formatMoney(Math.round(Math.abs(Number(value))))}
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
            labelStyle={{ color: theme.palette.text.secondary }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: theme.palette.text.secondary }} itemSorter={(item) => legendOrder.indexOf(String(item.dataKey))} />
          <ReferenceLine y={0} stroke={theme.palette.text.secondary} strokeOpacity={0.4} />
          <Area type="monotone" dataKey="savings" name="Savings" stackId="all" stroke={brand.green} fill={brand.green} fillOpacity={0.4} />
          <Area type="monotone" dataKey="investments" name="Investments" stackId="all" stroke={brand.blue} fill={brand.blue} fillOpacity={0.4} />
          {hasOther && <Area type="monotone" dataKey="other" name="Other assets" stackId="all" stroke={brand.neutral} fill={brand.neutral} fillOpacity={0.4} />}
          {/* Debt stands alone below zero. Stacked with "sign" offset, a debt of exactly 0 counts as positive and jumps to the top of the assets. */}
          {hasDebt && <Area type="monotone" dataKey="debt" name="Debt" stroke={brand.red} fill={brand.red} fillOpacity={0.4} />}
          <Line type="monotone" dataKey="netWorth" name="Net worth" stroke={brand.yellow} strokeWidth={2.5} dot={false} />
          {year > 0 && <ReferenceLine x={year} stroke={theme.palette.text.primary} strokeDasharray="4 4" />}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
