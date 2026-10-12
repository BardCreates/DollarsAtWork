import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { useResendConfirmation, type Me } from '../../auth/auth';
import { passwordRule } from '../../auth/passwordRule';
import { exportLinks, useChangePassword, useDeleteAccount, useRequestEmailChange } from './account';

const fieldErrorOf = (error: unknown, field: string) => (error instanceof ApiError ? error.fieldErrors(field)[0] : undefined);

/** Email (with change) and password (with change). */
export function AccountCard({ me }: { me: Me }) {
  const resend = useResendConfirmation();
  const [open, setOpen] = useState<'email' | 'password' | null>(null);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Account
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Typography color="text.secondary" sx={{ width: { xs: '100%', sm: 120 } }}>
            Email
          </Typography>
          <Typography sx={{ wordBreak: 'break-all' }}>{me.email}</Typography>
          <Chip size="small" color={me.emailConfirmed ? 'success' : 'warning'} label={me.emailConfirmed ? 'Confirmed' : 'Not confirmed'} />
          <Box sx={{ flex: 1 }} />
          {!me.emailConfirmed && (
            <Button size="small" onClick={() => resend.mutate()} disabled={resend.isPending || resend.isSuccess}>
              {resend.isSuccess ? 'Email sent' : 'Resend confirmation'}
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={() => setOpen(open === 'email' ? null : 'email')}>
            Change email
          </Button>
        </Box>
        {resend.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorMessage(resend.error)}
          </Alert>
        )}
        {open === 'email' && <ChangeEmailForm onDone={() => setOpen(null)} />}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Typography color="text.secondary" sx={{ width: { xs: '100%', sm: 120 } }}>
            Password
          </Typography>
          <Typography>••••••••</Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" onClick={() => setOpen(open === 'password' ? null : 'password')}>
            Change password
          </Button>
        </Box>
        {open === 'password' && <ChangePasswordForm onDone={() => setOpen(null)} />}
      </CardContent>
    </Card>
  );
}

const emailSchema = z.object({
  newEmail: z.string().trim().email('Enter a valid email address.'),
  currentPassword: z.string().min(1, 'Enter your password.'),
});
type EmailValues = z.infer<typeof emailSchema>;

function ChangeEmailForm({ onDone }: { onDone: () => void }) {
  const request = useRequestEmailChange();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  if (request.isSuccess) {
    return (
      <Alert severity="success" sx={{ mt: 2 }} onClose={onDone}>
        If {getValues('newEmail')} is available, we've sent it a confirmation link. Your email changes when you open that link.
      </Alert>
    );
  }

  const emailError = errors.newEmail?.message ?? fieldErrorOf(request.error, 'newEmail');
  const passwordError = errors.currentPassword?.message ?? fieldErrorOf(request.error, 'currentPassword');

  return (
    <Box component="form" noValidate onSubmit={handleSubmit((values) => request.mutate(values))} sx={{ mt: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        {request.isError && !emailError && !passwordError && <Alert severity="error">{errorMessage(request.error)}</Alert>}
        <TextField size="small" label="New email" type="email" autoComplete="email" autoFocus {...muiField(register, 'newEmail')} error={!!emailError} helperText={emailError} />
        <TextField
          size="small"
          label="Your password"
          type="password"
          autoComplete="current-password"
          {...muiField(register, 'currentPassword')}
          error={!!passwordError}
          helperText={passwordError ?? 'To confirm it is you.'}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={request.isPending}>
            Send confirmation link
          </Button>
          <Button color="inherit" onClick={onDone}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match." });
type PasswordValues = z.infer<typeof passwordSchema>;

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const change = useChangePassword();
  const { register, handleSubmit, formState: { errors } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (change.isSuccess) {
    return (
      <Alert severity="success" sx={{ mt: 2 }} onClose={onDone}>
        Your password is changed. Other devices have been signed out.
      </Alert>
    );
  }

  const currentError = errors.currentPassword?.message ?? fieldErrorOf(change.error, 'currentPassword');
  const newError = errors.newPassword?.message ?? fieldErrorOf(change.error, 'newPassword');

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(({ currentPassword, newPassword }) => change.mutate({ currentPassword, newPassword }))}
      sx={{ mt: 2 }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        {change.isError && !currentError && !newError && <Alert severity="error">{errorMessage(change.error)}</Alert>}
        <TextField size="small" label="Current password" type="password" autoComplete="current-password" autoFocus {...muiField(register, 'currentPassword')} error={!!currentError} helperText={currentError} />
        <TextField
          size="small"
          label="New password"
          type="password"
          autoComplete="new-password"
          {...muiField(register, 'newPassword')}
          error={!!newError}
          helperText={newError ?? 'At least 8 characters, including a number.'}
        />
        <TextField
          size="small"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          {...muiField(register, 'confirmPassword')}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={change.isPending}>
            Change password
          </Button>
          <Button color="inherit" onClick={onDone}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

/** Take your data with you, or leave entirely. */
export function DataCard() {
  const navigate = useNavigate();
  const remove = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');

  const passwordError = fieldErrorOf(remove.error, 'password');
  const close = () => {
    setConfirming(false);
    setPassword('');
    remove.reset();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Your data
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Download everything you've entered: your plan, goals, debts, accounts and net-worth history.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button variant="outlined" component="a" href={exportLinks.csv} download>
            Download as spreadsheets (CSV)
          </Button>
          <Button variant="outlined" component="a" href={exportLinks.json} download>
            Download as JSON
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Delete account
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Permanently removes your account and everything in it, and cancels any subscription. This can't be undone.
        </Typography>
        <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Dialog open={confirming} onClose={close} fullWidth maxWidth="xs">
        <Box
          component="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (password) remove.mutate(password, { onSuccess: () => navigate('/sign-in', { replace: true, state: { deleted: true } }) });
          }}
        >
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Your plan, goals, debts, accounts and history will be deleted for good, and any subscription is canceled now with no refund for unused time. Download
              your data first if you want a copy.
            </DialogContentText>
            {remove.isError && !passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage(remove.error)}
              </Alert>
            )}
            <TextField
              label="Your password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={!!passwordError}
              helperText={passwordError ?? 'Enter your password to confirm.'}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={close}>
              Keep my account
            </Button>
            <Button type="submit" color="error" variant="contained" disabled={!password || remove.isPending}>
              Delete forever
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Card>
  );
}
