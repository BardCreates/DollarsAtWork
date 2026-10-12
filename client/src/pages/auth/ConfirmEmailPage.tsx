import { useEffect, useRef } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { useConfirmEmail, useMe } from '../../auth/auth';
import { errorMessage } from '../../api/client';

export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const userId = params.get('userId') ?? '';
  const token = params.get('token') ?? '';
  const confirm = useConfirmEmail();
  const { data: me } = useMe();
  const started = useRef(false);

  useEffect(() => {
    // Run once, even in React's development double-render.
    if (started.current || !userId || !token) return;
    started.current = true;
    confirm.mutate({ userId, token });
  }, [userId, token, confirm]);

  const next = me ? { to: '/', label: 'Go to your dashboard' } : { to: '/sign-in', label: 'Sign in' };

  return (
    <AuthLayout title="Confirm your email">
      {(!userId || !token) && <Alert severity="error">This confirmation link is incomplete.</Alert>}
      {confirm.isPending && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {confirm.isSuccess && <Alert severity="success">Thanks! Your email address is confirmed.</Alert>}
      {confirm.isError && <Alert severity="error">{errorMessage(confirm.error)}</Alert>}
      {!confirm.isPending && (
        <Button component={RouterLink} to={next.to} variant="contained" fullWidth sx={{ mt: 2 }}>
          {next.label}
        </Button>
      )}
    </AuthLayout>
  );
}
