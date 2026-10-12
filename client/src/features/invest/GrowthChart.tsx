import { Box, useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import { brand } from '../../theme';
import type { YearPoint } from './investments';

const legendOrder = ['contributed', 'matched', 'growth'];

/** What you put in, what your employer adds and what growth adds, year by year. */
export function GrowthChart({ years }: { years: YearPoint[] }) {
  const theme = useTheme();
  const hasMatch = years.some((point) => point.matched > 0);
  const thisYear = new Date().getFullYear();

  return (
    <Box sx={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={years} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, years.length - 1]}
            tickFormatter={(year: number) => String(thisYear + year)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            tickCount={7}
          />
          <YAxis
            tickFormatter={(value: number) => formatMoneyCompact(value)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            width={60}
          />
          <Tooltip
            labelFormatter={(year) => `${thisYear + Number(year)} (in ${year} ${Number(year) === 1 ? 'year' : 'years'})`}
            formatter={(value) => formatMoney(Number(value))}
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
            labelStyle={{ color: theme.palette.text.secondary }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: theme.palette.text.secondary }} itemSorter={(item) => legendOrder.indexOf(String(item.dataKey))} />
          <Area type="monotone" dataKey="contributed" name="You put in" stackId="value" stroke={brand.blue} fill={brand.blue} fillOpacity={0.4} />
          {hasMatch && <Area type="monotone" dataKey="matched" name="Employer match" stackId="value" stroke={brand.yellow} fill={brand.yellow} fillOpacity={0.4} />}
          <Area type="monotone" dataKey="growth" name="Growth" stackId="value" stroke={brand.green} fill={brand.green} fillOpacity={0.4} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
