import { Box, Card, CardContent, Slider, Typography } from '@mui/material';
import { formatMoney } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import { DASHBOARD_YEARS } from './useDashboard';

const marks = [0, 10, 20, 30, 40].map((value) => ({ value, label: value === 0 ? 'Today' : `${value}y` }));
const whole = (value: number) => formatMoney(Math.round(value));

/** Net worth today, and what the plan projects at the year picked on the slider. */
export function NetWorthCard({ result, year, onYearChange, todaysDollars }: { result: ProjectionResult; year: number; onYearChange: (year: number) => void; todaysDollars: boolean }) {
  const today = result.points[0];
  const then = result.points[year * 12];
  const change = then.netWorth - today.netWorth;
  const assets = then.savings + then.investments + then.otherAssets;
  const owed = then.debt + then.otherLiabilities;
  const assetShare = assets + owed > 0 ? (assets / (assets + owed)) * 100 : 100;
  const calendarYear = new Date().getFullYear() + year;

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Typography variant="body2" color="text.secondary">
          Net worth today
        </Typography>
        <Typography variant="h3" component="p" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: today.netWorth < 0 ? 'error.main' : 'text.primary', fontSize: { xs: '2.2rem', md: '3rem' } }}>
          {whole(today.netWorth)}
        </Typography>

        <Box sx={{ px: 1.5, mt: 3 }}>
          <Slider
            value={year}
            min={0}
            max={DASHBOARD_YEARS}
            step={1}
            marks={marks}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => (value === 0 ? 'Today' : `${value} years`)}
            onChange={(_, value) => onYearChange(value as number)}
            aria-label="Years from now"
          />
        </Box>

        <Box sx={{ display: 'grid', gap: 3, mt: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {year === 0 ? 'Right now' : `In ${year} ${year === 1 ? 'year' : 'years'} (${calendarYear})`}
            </Typography>
            <Typography variant="h4" component="p" color={then.netWorth < 0 ? 'error.main' : 'success.main'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {whole(then.netWorth)}
            </Typography>
            {year > 0 && (
              <Typography variant="body2" color={change >= 0 ? 'success.main' : 'error.main'}>
                {change >= 0 ? '+' : '−'}
                {whole(Math.abs(change))} from today{todaysDollars ? ", in today's dollars" : ''}
              </Typography>
            )}
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" color="success.main">
                Assets {whole(assets)}
              </Typography>
              <Typography variant="body2" color="error.main">
                Debts {whole(owed)}
              </Typography>
            </Box>
            <Box role="img" aria-label={`Assets ${whole(assets)}, debts ${whole(owed)}`} sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: 'divider' }}>
              <Box sx={{ width: `${assetShare}%`, bgcolor: 'success.main' }} />
              <Box sx={{ flex: 1, bgcolor: 'error.main' }} />
            </Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
              Savings {whole(then.savings)} · Investments {whole(then.investments)}
              {then.otherAssets > 0 ? ` · Other ${whole(then.otherAssets)}` : ''}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
