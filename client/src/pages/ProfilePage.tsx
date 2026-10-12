import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack } from '@mui/material';
import { PageHeader } from '../components/PageHeader';
import { useMe, useSignOut } from '../auth/auth';
import { AccountCard, DataCard } from '../features/account/AccountCards';
import { BillingCard } from '../features/billing/BillingCard';

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
        <DataCard />
        <Box>
          <Button variant="outlined" onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/sign-in', { replace: true }) })}>
            Sign out
          </Button>
        </Box>
      </Stack>
    </>
  );
}
