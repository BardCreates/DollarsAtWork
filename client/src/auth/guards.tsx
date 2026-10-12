import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useMe } from './auth';
import { errorMessage } from '../api/client';

function FullPageSpinner() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

function FullPageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>}>
        {errorMessage(error)}
      </Alert>
    </Box>
  );
}

/** Pages inside the app. Signed-out visitors go to sign-in and come back afterwards. */
export function RequireAuth() {
  const { data: me, isPending, isError, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (isError) return <FullPageError error={error} onRetry={() => refetch()} />;
  if (!me) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Sign-in and sign-up pages. Already signed-in users go straight to the app; a new sign-up goes to the setup walkthrough. */
export function PublicOnly() {
  const { data: me, isPending } = useMe();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (location.pathname === '/sign-up' ? '/welcome' : '/');

  if (isPending) return <FullPageSpinner />;
  if (me) return <Navigate to={from} replace />;
  return <Outlet />;
}
