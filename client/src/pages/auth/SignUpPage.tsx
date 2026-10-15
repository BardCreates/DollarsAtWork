import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { muiField } from '../../components/formHelpers';
import { useSignUp } from '../../auth/auth';
import { passwordRule } from '../../auth/passwordRule';
import { ApiError, errorMessage } from '../../api/client';
import { cleanSignupSource } from '../../lib/signUp';

const schema = z
  .object({
    email: z.string().trim().email('Enter a valid email address.'),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });
type FormValues = z.infer<typeof schema>;

export function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();
  const [params] = useSearchParams();
  const source = cleanSignupSource(params.get('from'));

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const serverError = signUp.error instanceof ApiError ? signUp.error : undefined;
  const emailError = errors.email?.message ?? serverError?.fieldErrors('email')[0];
  const passwordError = errors.password?.message ?? serverError?.fieldErrors('password')[0];
  const generalError = signUp.isError && !emailError && !passwordError ? errorMessage(signUp.error) : undefined;

  const onSubmit = handleSubmit(({ email, password }) =>
    signUp.mutate({ email, password, source }, { onSuccess: () => navigate('/welcome', { replace: true }) }),
  );

  return (
    <AuthLayout
      title="Start your free trial"
      subtitle="30 days of full access. No card needed."
      footer={
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link component={RouterLink} to="/sign-in">
            Sign in
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={onSubmit} noValidate>
        <Stack spacing={2}>
          {generalError && <Alert severity="error">{generalError}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            {...muiField(register, 'email')}
            error={!!emailError}
            helperText={emailError}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            {...muiField(register, 'password')}
            error={!!passwordError}
            helperText={passwordError ?? 'At least 8 characters, including a number.'}
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...muiField(register, 'confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={signUp.isPending}>
            {signUp.isPending ? 'Creating your account…' : 'Create account'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            By creating an account you agree to our{' '}
            <Link component={RouterLink} to="/terms">
              Terms
            </Link>{' '}
            and{' '}
            <Link component={RouterLink} to="/privacy">
              Privacy Policy
            </Link>
            .
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
