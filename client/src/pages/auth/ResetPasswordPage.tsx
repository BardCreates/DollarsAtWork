import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { muiField } from '../../components/formHelpers';
import { useResetPassword } from '../../auth/auth';
import { passwordRule } from '../../auth/passwordRule';
import { errorMessage } from '../../api/client';

const schema = z
  .object({ newPassword: passwordRule, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match." });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const reset = useResetPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!email || !token) {
    return (
      <AuthLayout title="Link not valid">
        <Alert severity="error" sx={{ mb: 2 }}>
          This reset link is incomplete. Request a new one.
        </Alert>
        <Button component={RouterLink} to="/forgot-password" variant="contained" fullWidth>
          Request a new link
        </Button>
      </AuthLayout>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Password updated">
        <Alert severity="success" sx={{ mb: 2 }}>
          Your password has been changed. Sign in with your new password.
        </Alert>
        <Button component={RouterLink} to="/sign-in" variant="contained" fullWidth>
          Sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={`For ${email}`}
      footer={
        <Typography variant="body2">
          <Link component={RouterLink} to="/sign-in">
            Back to sign in
          </Link>
        </Typography>
      }
    >
      <Box component="form" noValidate onSubmit={handleSubmit(({ newPassword }) => reset.mutate({ email, token, newPassword }))}>
        <Stack spacing={2}>
          {reset.isError && <Alert severity="error">{errorMessage(reset.error)}</Alert>}
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            autoFocus
            {...muiField(register, 'newPassword')}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message ?? 'At least 8 characters, including a number.'}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            {...muiField(register, 'confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={reset.isPending}>
            {reset.isPending ? 'Saving…' : 'Save new password'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
