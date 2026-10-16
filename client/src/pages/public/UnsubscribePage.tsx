import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { api, errorMessage } from '../../api/client';
import { usePageMeta } from '../../lib/usePageMeta';
import { PublicLayout } from './PublicLayout';

/**
 * Where the "Unsubscribe" link in an onboarding email lands. It asks first, because email security scanners open
 * links on their own; mail apps' one-click unsubscribe POSTs to the same endpoint directly. No sign-in needed.
 */
export function UnsubscribePage() {
  usePageMeta('Unsubscribe');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const unsubscribe = useMutation({ mutationFn: () => api.post(`/email/unsubscribe?token=${encodeURIComponent(token)}`) });

  return (
    <PublicLayout maxWidth="sm">
      <Card>
        <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <Box component="img" src={mascot} alt="" sx={{ width: 96, height: 'auto', mb: 2 }} />
          {unsubscribe.isSuccess ? (
            <>
              <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
                Done. No more tips from us
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                You won't get any more getting-started emails. We'll still email you about your account itself, such as password resets, your trial
                ending, and receipts.
              </Typography>
              <Button component={RouterLink} to="/" variant="outlined">
                Go to Dollars at Work
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
                Stop the getting-started emails?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                These are the few tips we send in your first days, like the welcome with your 10-year number and the what-if idea. Emails about
                your account itself, such as password resets, your trial ending and receipts, still come.
              </Typography>
              {!token && (
                <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                  This link is missing its code. Use the link in the email again, or reply to the email and we'll take you off by hand.
                </Alert>
              )}
              {unsubscribe.isError && (
                <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                  {errorMessage(unsubscribe.error)}
                </Alert>
              )}
              <Button variant="contained" size="large" disabled={!token || unsubscribe.isPending} onClick={() => unsubscribe.mutate()}>
                {unsubscribe.isPending ? 'Unsubscribing…' : 'Unsubscribe'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
