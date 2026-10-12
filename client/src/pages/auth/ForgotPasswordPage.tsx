import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { muiField } from '../../components/formHelpers';
import { useForgotPassword } from '../../auth/auth';
import { errorMessage } from '../../api/client';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const backToSignIn = (
    <Typography variant="body2">
      <Link component={RouterLink} to="/sign-in">
        Back to sign in
      </Link>
    </Typography>
  );

  if (forgot.isSuccess) {
    return (
      <AuthLayout title="Check your email" footer={backToSignIn}>
        <Alert severity="success">
          If an account exists for {getValues('email')}, we've sent a link to reset your password. It works for 24 hours.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link." footer={backToSignIn}>
      <Box component="form" noValidate onSubmit={handleSubmit(({ email }) => forgot.mutate(email))}>
        <Stack spacing={2}>
          {forgot.isError && <Alert severity="error">{errorMessage(forgot.error)}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            {...muiField(register, 'email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={forgot.isPending}>
            {forgot.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
