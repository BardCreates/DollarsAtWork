import { useEffect, useRef } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { useMe } from '../../auth/auth';
import { useConfirmEmailChange } from '../../features/account/account';
import { errorMessage } from '../../api/client';

/** Opened from the link sent to a new email address; switches the account over to it. */
export function ConfirmEmailChangePage() {
  const [params] = useSearchParams();
  const userId = params.get('userId') ?? '';
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const complete = !!userId && !!email && !!token;

  const confirm = useConfirmEmailChange();
  const { data: me } = useMe();
  const started = useRef(false);

  useEffect(() => {
    // Run once, even in React's development double-render.
    if (started.current || !complete) return;
    started.current = true;
    confirm.mutate({ userId, email, token });
  }, [complete, userId, email, token, confirm]);

  const next = me ? { to: '/profile', label: 'Back to your profile' } : { to: '/sign-in', label: 'Sign in' };

  return (
    <AuthLayout title="Confirm your new email">
      {!complete && <Alert severity="error">This link is incomplete.</Alert>}
      {confirm.isPending && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {confirm.isSuccess && <Alert severity="success">Done. You now sign in with {email}.</Alert>}
      {confirm.isError && <Alert severity="error">{errorMessage(confirm.error)}</Alert>}
      {!confirm.isPending && (
        <Button component={RouterLink} to={next.to} variant="contained" fullWidth sx={{ mt: 2 }}>
          {next.label}
        </Button>
      )}
    </AuthLayout>
  );
}
