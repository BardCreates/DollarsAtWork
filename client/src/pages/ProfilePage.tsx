import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { PageHeader } from '../components/PageHeader';
import { useMe, useSignOut } from '../auth/auth';
import { AccountCard, DataCard } from '../features/account/AccountCards';
import { InstallCard } from '../features/account/InstallCard';
import { BillingCard } from '../features/billing/BillingCard';
import { HintsCard } from '../features/hints/HintsCard';

export function ProfilePage() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();

  if (!me) return null;

  return (
    <>
      <PageHeader title="Profile & billing" />
      <Stack spacing={3} sx={{ maxWidth: 760 }}>
        <AccountCard me={me} />
        <BillingCard access={me.access} />
        <HintsCard hints={me.hints} />
        <InstallCard />
        <DataCard />
        {me.isOwner && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Numbers
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                Only you see this: anonymous counts of visits, calculator use, sign-ups, trials and subscriptions.
              </Typography>
              <Button component={RouterLink} to="/numbers" variant="outlined" size="small">
                Open the numbers
              </Button>
            </CardContent>
          </Card>
        )}
        <Box>
          <Button variant="outlined" onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/sign-in', { replace: true }) })}>
            Sign out
          </Button>
        </Box>
      </Stack>
    </>
  );
}
