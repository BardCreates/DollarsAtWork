import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { PageHeader } from '../components/PageHeader';
import { useMe, useResendConfirmation, useSignOut } from '../auth/auth';
import { BillingCard } from '../features/billing/BillingCard';
import { errorMessage } from '../api/client';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, py: 1.5 }}>
      <Typography color="text.secondary" sx={{ width: 160 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>{children}</Box>
    </Box>
  );
}

export function ProfilePage() {
  const { data: me } = useMe();
  const resend = useResendConfirmation();
  const signOut = useSignOut();
  const navigate = useNavigate();

  if (!me) return null;

  return (
    <>
      <PageHeader title="Profile & billing" />
      <Stack spacing={3} sx={{ maxWidth: 760 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Account
            </Typography>
            <Row label="Email">
              <Typography>{me.email}</Typography>
              {me.emailConfirmed ? (
                <Chip size="small" color="success" label="Confirmed" />
              ) : (
                <>
                  <Chip size="small" color="warning" label="Not confirmed" />
                  <Button size="small" onClick={() => resend.mutate()} disabled={resend.isPending || resend.isSuccess}>
                    {resend.isSuccess ? 'Email sent' : 'Resend confirmation email'}
                  </Button>
                </>
              )}
            </Row>
            {resend.isError && <Alert severity="error">{errorMessage(resend.error)}</Alert>}
            <Divider sx={{ my: 1 }} />
            <Row label="Password">
              <Typography color="text.secondary">Change your password from the sign-in page with “Forgot password?”.</Typography>
            </Row>
          </CardContent>
        </Card>

        <BillingCard access={me.access} />

        <Box>
          <Button
            color="error"
            variant="outlined"
            onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/sign-in', { replace: true }) })}
          >
            Sign out
          </Button>
        </Box>
      </Stack>
    </>
  );
}
