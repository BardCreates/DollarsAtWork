import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button } from '@mui/material';
import { errorMessage } from '../../api/client';
import { useResendConfirmation, type Me } from '../../auth/auth';

/**
 * The dashboard's reminder while the email address is unconfirmed: a mistyped address otherwise gets no trial emails
 * and nobody notices. Says where the link went, and offers a resend or a fix on Profile. Gone once confirmed.
 */
export function ConfirmEmailNotice({ me }: { me: Me | null | undefined }) {
  const resend = useResendConfirmation();
  if (!me || me.emailConfirmed) return null;

  return (
    <Alert
      severity="info"
      sx={{ mb: 3, '& .MuiAlert-message': { minWidth: 0 } }}
      action={
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
          <Button color="inherit" size="small" variant="outlined" onClick={() => resend.mutate()} disabled={resend.isPending || resend.isSuccess}>
            {resend.isSuccess ? 'Sent' : resend.isPending ? 'Sending…' : 'Resend'}
          </Button>
          <Button color="inherit" size="small" component={RouterLink} to="/profile">
            Fix email
          </Button>
        </Box>
      }
    >
      Check your inbox: we sent a link to <Box component="strong" sx={{ wordBreak: 'break-all' }}>{me.email}</Box> to confirm it. Your trial reminders go
      there too, so if it's misspelled, fix it on your Profile.
      {resend.isError && <Box sx={{ mt: 0.5 }}>{errorMessage(resend.error)}</Box>}
    </Alert>
  );
}
