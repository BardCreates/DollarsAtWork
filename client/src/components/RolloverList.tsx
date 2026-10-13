import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import { formatMonthFromNow } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { FreedMoneyDestination } from '../lib/projection';
import type { Rollover } from '../lib/rollover';

const destinationLabels: Record<FreedMoneyDestination, string> = {
  investments: 'your investments',
  savings: 'your savings goals',
  debt: 'your debt payoff',
  remaining: 'your Remaining',
};

/** "A", "A and B", or a count when there are too many to list. */
function listNames(names: string[], count: number, noun: string): string {
  if (count <= 2) return names.join(' and ');
  return `your ${count} other open ${noun}`;
}

interface RolloverListProps {
  title: string;
  rollovers: Rollover[];
  /** Name of each debt or goal, in the same order the projection was run with. */
  names: string[];
  /** How it finishes: "paid off" for a debt, "full" for a goal. */
  doneWord: string;
  /** What a group is called when several share the money: "goals". */
  groupNoun: string;
}

/**
 * Where each finished debt's or goal's money goes next, and when, in plain sentences.
 * Renders nothing when no one finishes within the projection.
 */
export function RolloverList({ title, rollovers, names, doneWord, groupNoun }: RolloverListProps) {
  if (rollovers.length === 0) return null;

  const sentences = [...rollovers]
    .sort((a, b) => a.month - b.month || a.index - b.index)
    .map((rollover) => {
      const what = rollover.amount === null ? 'its money' : `its ${formatMoney(Math.round(rollover.amount))} a month`;
      const { target } = rollover;

      let ending: string;
      if (target.kind === 'items') {
        ending = `${what} moves to ${listNames(target.indexes.map((i) => names[i]), target.indexes.length, groupNoun)}`;
      } else if (target.destination === 'remaining') {
        ending = `${what} goes back to ${destinationLabels.remaining}`;
      } else {
        ending = `${what} moves to ${destinationLabels[target.destination]}`;
      }

      return {
        key: `${rollover.index}-${rollover.month}`,
        text: `When ${names[rollover.index]} is ${doneWord} in ${formatMonthFromNow(rollover.month)}, ${ending}.`,
      };
    });

  return (
    <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1 }}>
        {sentences.map((sentence) => (
          <Box component="li" key={sentence.key} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
            <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, transform: 'translateY(-1px)' }} />
            <Typography variant="body2">{sentence.text}</Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
        What happens once everything is done is set under Assumptions on the{' '}
        <Link component={RouterLink} to="/" underline="hover">
          Dashboard
        </Link>
        .
      </Typography>
    </Box>
  );
}
