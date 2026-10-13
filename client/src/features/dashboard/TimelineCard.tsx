import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Box, ButtonBase, Chip, Link, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { isDone, isNear, nextUp, type TimelineItem, type TimelineKind } from '../../lib/timeline';
import { brand } from '../../theme';
import { DashCard } from './cards';

const kindColor: Record<TimelineKind, string> = {
  debt: brand.red,
  'debt-free': brand.red,
  goal: brand.green,
  'net-worth': brand.yellow,
};

const kindLink: Partial<Record<TimelineKind, { to: string; label: string }>> = {
  debt: { to: '/debt', label: 'Debt' },
  'debt-free': { to: '/debt', label: 'Debt' },
  goal: { to: '/savings', label: 'Savings' },
};

/** Within this many months, a milestone sets the mascot off on its own. */
const AUTO_CELEBRATE_MONTHS = 1;

/** Once per visit, not once per render: the dashboard re-renders on every slider move. */
let celebratedThisVisit = false;

function celebrate() {
  confetti({
    particleCount: 110,
    spread: 80,
    origin: { y: 0.55 },
    colors: [brand.green, brand.yellow, brand.pink, brand.blue],
    // People who have asked their device for less motion get none.
    disableForReducedMotion: true,
  });
}

function whenText(month: number): string {
  return month === 1 ? 'next month' : `in ${formatDuration(month)}`;
}

/** What the mascot says: the next milestone, or what to do to get some. */
function headline(items: TimelineItem[]): string {
  const next = nextUp(items);
  if (next && next.month !== null) return `Next up: ${next.label}, ${whenText(next.month)}.`;
  if (items.some(isDone)) return "You've hit every milestone on your roadmap. Nice work!";
  return 'Add a debt, a goal or an investment account and your roadmap appears here.';
}

/** The dashboard roadmap: dated milestones in order, with the mascot cheering as one gets close. */
export function TimelineCard({ items, links = true }: { items: TimelineItem[]; /** Link each item to its module page. Off for the public demo, which has no pages to go to. */ links?: boolean }) {
  const ahead = items.filter((item) => !isDone(item));
  const done = items.filter(isDone);
  const next = nextUp(items);
  const closeEnough = next !== null && next.month !== null && next.month <= AUTO_CELEBRATE_MONTHS;

  useEffect(() => {
    if (!closeEnough || celebratedThisVisit) return;
    celebratedThisVisit = true;
    celebrate();
  }, [closeEnough]);

  return (
    <DashCard title="Money timeline">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ButtonBase
          onClick={celebrate}
          aria-label="Celebrate"
          title="Tap to celebrate"
          sx={{ flexShrink: 0, borderRadius: 2, '&:active img': { transform: 'scale(0.92) rotate(-6deg)' } }}
        >
          <Box component="img" src={mascot} alt="" sx={{ width: 52, height: 'auto', transition: 'transform 120ms' }} />
        </ButtonBase>
        <Typography variant="body2" role="status" sx={{ fontWeight: 600 }}>
          {headline(items)}
        </Typography>
      </Box>

      {ahead.length > 0 && (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {ahead.map((item, index) => {
            const near = isNear(item);
            const link = links ? kindLink[item.kind] : undefined;
            const last = index === ahead.length - 1;
            return (
              <Box component="li" key={item.key} sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
                {/* The rail: a dot per milestone, joined by a line. */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0, pt: 0.75 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: item.month === null ? 'transparent' : kindColor[item.kind],
                      border: 2,
                      borderStyle: item.month === null ? 'dashed' : 'solid',
                      borderColor: kindColor[item.kind],
                      boxShadow: near ? `0 0 0 4px ${kindColor[item.kind]}33` : 'none',
                    }}
                  />
                  {!last && <Box sx={{ flex: 1, width: 2, bgcolor: 'divider', mt: 0.5 }} />}
                </Box>

                <Box sx={{ minWidth: 0, pb: last ? 0 : 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: near ? 700 : 500 }}>
                      {item.label}
                    </Typography>
                    {near && <Chip size="small" color="primary" variant="outlined" label="Almost there" />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {item.month === null ? (
                      'Not within 40 years at this pace'
                    ) : (
                      <>
                        {formatMonthFromNow(item.month)} · {whenText(item.month)}
                      </>
                    )}
                    {link && (
                      <>
                        {' · '}
                        <Link component={RouterLink} to={link.to} underline="hover">
                          {link.label}
                        </Link>
                      </>
                    )}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {done.length > 0 && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: ahead.length > 0 ? 2 : 0 }}>
          Already reached: {done.map((item) => item.label.replace(/ reached$/, '')).join(', ')}.
        </Typography>
      )}
    </DashCard>
  );
}
