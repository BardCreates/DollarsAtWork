import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { signUpPath } from '../../lib/signUp';

const SAMPLE_PLAN = { label: 'See a sample plan', to: '/demo' };

/**
 * The close of every public calculator, the demo and every blog post: take the numbers you just read about
 * and put your own in. Only ever shown to visitors who aren't signed in. `from` says which page the sign-up came from.
 */
export function TrialCta({
  headline,
  body,
  from,
  primaryLabel = 'Start your free trial',
  secondary = SAMPLE_PLAN,
}: {
  headline: string;
  body: string;
  from: string;
  primaryLabel?: string;
  /** A second, lighter button; null for none. */
  secondary?: { label: string; to: string } | null;
}) {
  return (
    <Card sx={{ mt: 4, outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, p: { xs: 2.5, md: 3 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 72, height: 'auto', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6">{headline}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
            {body}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
            <Button component={RouterLink} to={signUpPath(from)} variant="contained" size="large">
              {primaryLabel}
            </Button>
            {secondary && (
              <Button component={RouterLink} to={secondary.to} variant="outlined" size="large">
                {secondary.label}
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: { xs: 2.5, md: 3 }, pb: 2 }}>
        30 days of full access. No card needed.
      </Typography>
    </Card>
  );
}
