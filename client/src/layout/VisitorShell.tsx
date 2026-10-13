import { Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useMe } from '../auth/auth';
import { PublicLayout } from '../pages/public/PublicLayout';
import { AppShell } from './AppShell';

/**
 * The frame for pages that anyone can open (the free calculators and the demo): the full app frame
 * with the top bar and trial banner when signed in, and the plain public frame when not.
 */
export function VisitorShell() {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (me) return <AppShell />;

  return (
    <PublicLayout maxWidth="lg">
      <Outlet />
    </PublicLayout>
  );
}
