import { useMemo, useState } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { Box, Card, CardContent, Slider, Typography } from '@mui/material';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { comparePlans, type PlanImpact } from '../../lib/planImpact';
import { project } from '../../lib/projection';
import type { ProjectionResult } from '../../lib/projection/types';
import { SAMPLE_MAX_EXTRA, SAMPLE_PERSON, sampleInput } from '../../lib/sampleData';

const whole = (value: number) => formatMoney(Math.round(value));

/** The sample person's plan with some extra money moved to debt, and what that does compared with no extra. */
export function useSampleImpact() {
  const [extra, setExtra] = useState(0);
  const base = useMemo(() => project(sampleInput(0)), []);
  const result = useMemo(() => project(sampleInput(extra)), [extra]);
  const impact = useMemo(() => comparePlans(base, result), [base, result]);
  return { extra, setExtra, result, impact };
}

/**
 * "Move a dollar, see your future" on the made-up sample plan: a slider for extra money toward debt,
 * with the debt-free date and 10-year net worth moving as it slides. Used on the demo and the home page.
 */
export function SampleImpactCard({
  extra,
  onExtraChange,
  result,
  impact,
  sx,
}: {
  extra: number;
  onExtraChange: (extra: number) => void;
  result: ProjectionResult;
  impact: PlanImpact;
  sx?: SxProps<Theme>;
}) {
  const sooner = impact.debtFree.monthsSooner;
  const gain = Math.round(impact.netWorth.change);

  return (
    <Card sx={sx}>
      <CardContent>
        <Typography variant="h6">Move a dollar, see your future</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          What if {SAMPLE_PERSON.name} put more toward debt each month?
        </Typography>
        <Box sx={{ px: 1.5 }}>
          <Slider
            value={extra}
            min={0}
            max={SAMPLE_MAX_EXTRA}
            step={25}
            marks={[0, 200, 400, 600].map((value) => ({ value, label: value === 0 ? '$0' : `$${value}` }))}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `+${formatMoney(value)}/month`}
            onChange={(_, value) => onExtraChange(value as number)}
            aria-label="Extra toward debt each month"
          />
        </Box>
        <Box role="status" aria-live="polite" sx={{ display: 'grid', gap: 2, mt: 2, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div">
              Debt-free
            </Typography>
            <Typography variant="h6" component="p">
              {result.debtFreeMonth === null ? 'Not within 40 years' : formatMonthFromNow(result.debtFreeMonth)}
            </Typography>
            <Typography variant="body2" color={sooner && sooner > 0 ? 'success.main' : 'text.secondary'} sx={{ fontWeight: sooner ? 600 : 400 }}>
              {extra === 0 || sooner === null ? ' ' : sooner > 0 ? `${formatDuration(sooner)} sooner` : 'No change'}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div">
              Net worth in 10 years, in today's dollars
            </Typography>
            <Typography variant="h6" component="p">
              {whole(impact.netWorth.after)}
            </Typography>
            <Typography variant="body2" color={gain > 0 ? 'success.main' : 'text.secondary'} sx={{ fontWeight: gain > 0 ? 600 : 400 }}>
              {extra === 0 ? ' ' : gain > 0 ? `+${whole(gain)}` : 'No change'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
