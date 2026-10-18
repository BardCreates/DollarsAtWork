import { Box, Button, Card, CardContent, Skeleton, Typography } from '@mui/material';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { IMPACT_YEARS, type PlanImpact } from '../../lib/planImpact';
import { TOP_BAR_HEIGHT } from '../../layout/TopBar';
import type { PlanImpactState } from './usePlanImpact';

type Tone = 'good' | 'bad' | 'none';
const toneColor: Record<Tone, string> = { good: 'success.main', bad: 'error.main', none: 'text.secondary' };

function debtFreeLine(debtFree: PlanImpact['debtFree']): { value: string; change: string; tone: Tone } {
  const { before, after, monthsSooner } = debtFree;
  const value = after === null ? 'Not within 40 years' : after === 0 ? 'No debt' : formatMonthFromNow(after);

  if (monthsSooner === null) {
    if (before === null && after !== null) return { value, change: 'Now gets paid off', tone: 'good' };
    if (before !== null && after === null) return { value, change: 'No longer gets paid off', tone: 'bad' };
    return { value, change: 'No change', tone: 'none' };
  }
  if (monthsSooner > 0) return { value, change: `${formatDuration(monthsSooner)} sooner`, tone: 'good' };
  if (monthsSooner < 0) return { value, change: `${formatDuration(-monthsSooner)} later`, tone: 'bad' };
  return { value, change: 'No change', tone: 'none' };
}

function netWorthLine(netWorth: PlanImpact['netWorth']): { value: string; change: string; tone: Tone } {
  const value = formatMoney(Math.round(netWorth.after));
  const change = Math.round(netWorth.change);
  if (change > 0) return { value, change: `+${formatMoney(change)}`, tone: 'good' };
  if (change < 0) return { value, change: `−${formatMoney(-change)}`, tone: 'bad' };
  return { value, change: 'No change', tone: 'none' };
}

interface ImpactPanelProps {
  state: PlanImpactState;
  /** Whether the plan on screen differs from the one being compared against. */
  changed: boolean;
  /** How much more a month is unassigned (Remaining) than in the plan being compared against. */
  freedMonthly: number;
  onCompareFromHere: () => void;
}

/**
 * Move a dollar, see your future: the debt-free date and 10-year net worth for the plan on screen,
 * and how far each has moved from the plan you started from. Updates as you type.
 * On phones it sticks under the top bar so it stays in view while you edit the list below it.
 */
export function ImpactPanel({ state, changed, freedMonthly, onCompareFromHere }: ImpactPanelProps) {
  if (state.status === 'unavailable') return null;

  const lines =
    state.status === 'ready'
      ? [
          { label: 'Debt-free', ...debtFreeLine(state.impact.debtFree) },
          { label: `Net worth in ${IMPACT_YEARS} years (today's dollars)`, ...netWorthLine(state.impact.netWorth) },
        ]
      : null;

  return (
    <Card
      sx={{
        order: { xs: -1, md: 0 },
        position: { xs: 'sticky', md: 'static' },
        top: TOP_BAR_HEIGHT + 8,
        zIndex: 2,
        outline: changed ? 1 : 0,
        outlineStyle: 'solid',
        outlineColor: 'primary.main',
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: { xs: 0.5, md: 1 } }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Move a dollar
          </Typography>
          {changed && (
            <Button size="small" onClick={onCompareFromHere}>
              Compare from here
            </Button>
          )}
        </Box>

        <Box role="status" aria-live="polite" sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: { xs: 1.5, md: 2 } }}>
          {lines
            ? lines.map((line) => (
                <Box key={line.label} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {line.label}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', md: '1.3rem' }, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }} noWrap>
                    {line.value}
                  </Typography>
                  <Typography variant="body2" color={toneColor[changed ? line.tone : 'none']} sx={{ fontWeight: changed && line.tone !== 'none' ? 600 : 400 }} noWrap>
                    {changed ? line.change : ' '}
                  </Typography>
                </Box>
              ))
            : [0, 1].map((i) => (
                <Box key={i}>
                  <Skeleton width="70%" />
                  <Skeleton width="90%" height={30} />
                </Box>
              ))}
        </Box>

        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: { xs: 0.5, md: 1 } }}>
          {!changed
            ? 'Change any amount and watch these move.'
            : lines?.every((line) => line.tone === 'none') && freedMonthly >= 1
              ? `You've freed ${formatMoney(Math.round(freedMonthly))} a month, but it has no job yet. Give it to Debt, Savings or Investments to see it work.`
              : 'Compared with where you started.'}
        </Typography>
      </CardContent>
    </Card>
  );
}
