import { Box, Typography, useTheme } from '@mui/material';
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney, formatPercent } from '../../lib/money';
import { brand } from '../../theme';
import { planTotals, type Plan } from './plan';

/** Where the month's income goes. Money without a job yet is the grey Remaining slice. */
export function AllocationDonut({ plan }: { plan: Plan }) {
  const theme = useTheme();
  const { remaining } = planTotals(plan);

  const slices = plan.categories
    .filter((c) => c.amount > 0)
    .map((c) => ({ key: c.id, name: c.name, value: c.amount, fill: c.color }));
  if (remaining > 0) slices.push({ key: 'remaining', name: 'Remaining', value: remaining, fill: brand.neutral });

  const isEmpty = slices.length === 0;
  const over = remaining < 0;

  return (
    <Box>
      <Box sx={{ position: 'relative', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={isEmpty ? [{ key: 'empty', name: 'Nothing planned yet', value: 1, fill: brand.neutral }] : slices}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={slices.length > 1 ? 1.5 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationDuration={300}
            />
            {!isEmpty && (
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 10,
                }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {over ? 'Over-allocated' : 'Remaining'}
            </Typography>
            <Typography variant="h6" color={over ? 'error.main' : remaining > 0 ? 'success.main' : 'text.primary'}>
              {formatMoney(Math.abs(remaining))}
            </Typography>
          </Box>
        </Box>
      </Box>

      {isEmpty ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Enter your income and give your categories amounts to see the split.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 2, p: 0, display: 'grid', gap: 0.75 }}>
          {slices.map((slice) => (
            <Box component="li" key={slice.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: slice.fill, flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {slice.name}
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(slice.value)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ width: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatPercent(slice.value, plan.monthlyIncome)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
