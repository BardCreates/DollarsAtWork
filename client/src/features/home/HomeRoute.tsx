import { Box, CircularProgress } from '@mui/material';
import { useMe } from '../../auth/auth';
import { AppShell } from '../../layout/AppShell';
import { DashboardPage } from '../dashboard/DashboardPage';
import { HomePage } from './HomePage';

/** "/" is the dashboard when signed in and the home page for everyone else. */
export function HomeRoute() {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If the server can't say who you are, show the public page: everything on it works without an account.
  if (!me) return <HomePage />;

  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}
