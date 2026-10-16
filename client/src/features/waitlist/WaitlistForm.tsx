import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import { errorMessage } from '../../api/client';
import { muiField } from '../../components/formHelpers';
import { useJoinWaitlist, type WaitlistSource } from './waitlist';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.') });
type FormValues = z.infer<typeof schema>;

/**
 * "Not ready yet? Get the occasional money note": an email box for visitors who aren't ready to start a trial.
 * Deliberately quieter than the trial button beside it (small heading, text button). No account is made.
 * Shown to signed-out visitors only. Addresses land in the WaitlistEntries table.
 */
export function WaitlistForm({ source, title = 'Not ready yet?', body }: { source: WaitlistSource; title?: string; body?: string }) {
  const join = useJoinWaitlist();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  return (
    <Box>
      <Typography variant="body2" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {body ?? 'Get the occasional money note: new articles and launch deals. No account needed.'}
      </Typography>

      {join.isSuccess ? (
        <Alert severity="success">You're in. Expect a note now and then, never a flood.</Alert>
      ) : (
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(({ email }) => join.mutate({ email, source }))}
          sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' }, gap: 1.5 }}
        >
          <TextField
            label="Email"
            type="email"
            size="small"
            autoComplete="email"
            {...muiField(register, 'email')}
            error={!!errors.email || join.isError}
            helperText={errors.email?.message ?? (join.isError ? errorMessage(join.error) : undefined)}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button type="submit" variant="text" disabled={join.isPending} sx={{ flexShrink: 0, height: 40 }}>
            {join.isPending ? 'Adding…' : 'Send me notes'}
          </Button>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        We only use it for these notes, and remove it whenever you ask. See the{' '}
        <Link component={RouterLink} to="/privacy" underline="hover" color="inherit">
          Privacy Policy
        </Link>
        .
      </Typography>
    </Box>
  );
}
