import { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ApiError, errorMessage } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useMe } from '../../auth/auth';
import { USAGE_EVENT_LABELS, describeChange, isUsageEvent } from '../../lib/usage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { useUsageSummary, type UsageCount } from './numbers';

type Window = 7 | 30;

/**
 * The owner's weekly numbers, without SQL: how many visits, calculator uses, sign-ups, trials, first projections
 * and subscriptions, this period against the one before, and which pages the sign-ups came from.
 * Only the owner sees it; everyone else gets the same page as a wrong address.
 */
export function NumbersPage() {
  const { data: me } = useMe();
  const [days, setDays] = useState<Window>(7);
  const summary = useUsageSummary(days);

  if (!me?.isOwner) return <NotFoundPage />;
  if (summary.error instanceof ApiError && summary.error.status === 404) return <NotFoundPage />;

  return (
    <>
      <PageHeader
        title="Numbers"
        subtitle="Anonymous counts: what people opened and what happened next. No names, no addresses."
        actions={
          <ToggleButtonGroup exclusive size="small" color="primary" value={days} onChange={(_, value: Window | null) => value && setDays(value)} aria-label="Period">
            <ToggleButton value={7} sx={{ px: 2 }}>
              7 days
            </ToggleButton>
            <ToggleButton value={30} sx={{ px: 2 }}>
              30 days
            </ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {summary.isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {summary.error && <Alert severity="error">{errorMessage(summary.error)}</Alert>}

      {summary.data && (
        <Box sx={{ display: 'grid', gap: 3, maxWidth: 860 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                The last {summary.data.days} days
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Compared with the {summary.data.days} days before that.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>What</TableCell>
                      <TableCell align="right">This period</TableCell>
                      <TableCell align="right">Before</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.data.events.map((row: UsageCount) => {
                      const change = describeChange(row.thisPeriod, row.previousPeriod);
                      return (
                        <TableRow key={row.name}>
                          <TableCell>{isUsageEvent(row.name) ? USAGE_EVENT_LABELS[row.name] : row.name}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {row.thisPeriod.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">{row.previousPeriod.toLocaleString()}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: change?.direction === 'up' ? 'success.main' : change?.direction === 'down' ? 'error.main' : 'text.secondary' }}
                          >
                            {change?.text ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Where sign-ups came from
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The page whose "start your free trial" button was used, over the last {summary.data.days} days.
              </Typography>
              {summary.data.signupSources.length === 0 ? (
                <Typography color="text.secondary">No sign-ups in this period yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Page</TableCell>
                        <TableCell align="right">Sign-ups</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.data.signupSources.map((row) => (
                        <TableRow key={row.source ?? ''}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{row.source ?? 'unknown'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {row.count.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Typography variant="caption" color="text.secondary">
            Each count is one anonymous event: its name, the time and the page's referral tag if it had one. Sign-ups, trials and subscriptions are
            counted by the server; visits, calculator use and first projections by the browser, so an ad blocker can hide some of those.
          </Typography>
        </Box>
      )}
    </>
  );
}
