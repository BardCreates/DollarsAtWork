import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Checkbox, FormControlLabel, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout } from './AuthLayout';
import { muiField } from '../../components/formHelpers';
import { useSignIn } from '../../auth/auth';
import { errorMessage } from '../../api/client';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const signIn = useSignIn();

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = handleSubmit((values) =>
    signIn.mutate(values, { onSuccess: () => navigate(from, { replace: true }) }),
  );

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to put your dollars to work."
      footer={
        <Typography variant="body2" color="text.secondary">
          New here?{' '}
          <Link component={RouterLink} to="/sign-up">
            Start your free 30-day trial
          </Link>
        </Typography>
      }
    >
      <Box component="form" onSubmit={onSubmit} noValidate>
        <Stack spacing={2}>
          {(location.state as { deleted?: boolean } | null)?.deleted && <Alert severity="success">Your account and all its data have been deleted.</Alert>}
          {signIn.isError && <Alert severity="error">{errorMessage(signIn.error)}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            {...muiField(register, 'email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            {...muiField(register, 'password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  label="Remember me"
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                />
              )}
            />
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Box>
          <Button type="submit" variant="contained" size="large" disabled={signIn.isPending}>
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
