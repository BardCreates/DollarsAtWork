import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button } from '@mui/material';
import { useMe } from '../auth/auth';

/** Shown under the top bar on every page while the account is not fully paid up. */
export function TrialBanner() {
  const banner = useBannerContent();
  return banner ? <Box sx={{ mb: 3 }}>{banner}</Box> : null;
}

function useBannerContent() {
  const { data: me } = useMe();
  if (!me) return null;
  const { access } = me;

  const action = (label: string) => (
    <Button component={RouterLink} to="/profile" color="inherit" size="small" variant="outlined">
      {label}
    </Button>
  );
  const subscribe = action('Subscribe');

  switch (access.status) {
    case 'Trialing': {
      const days = access.trialDaysLeft;
      const severity = days <= 7 ? 'warning' : 'info';
      return (
        <Alert severity={severity} action={subscribe}>
          {days === 1 ? '1 day' : `${days} days`} left in your free trial. {days === 1 ? 'Make it count.' : 'Make them count.'}
        </Alert>
      );
    }
    case 'PastDue':
      return (
        <Alert severity="warning" action={action('Update card')}>
          Your last payment didn't go through. Update your card within 7 days and nothing changes.
        </Alert>
      );
    case 'Canceled':
      return (
        <Alert severity="info" action={action('Resubscribe')}>
          Your subscription ends on {access.currentPeriodEnd ? new Date(access.currentPeriodEnd).toLocaleDateString() : 'the end of this period'}.
        </Alert>
      );
    case 'Expired':
      return (
        <Alert severity="error" action={subscribe}>
          Your access has ended, but nothing's lost. Everything is still here to look at. Subscribe to start editing again.
        </Alert>
      );
    default:
      return null;
  }
}
