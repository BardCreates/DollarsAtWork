import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import mascot from '../assets/mascot.png';
import { useMe } from '../auth/auth';
import { usePageMeta } from '../lib/usePageMeta';

/** Any address the app doesn't know. Visitors get ways into the public pages; signed-in people get their dashboard. */
export function NotFoundPage() {
  const { data: me } = useMe();
  usePageMeta('Page not found');

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Box component="img" src={mascot} alt="" sx={{ width: 140, height: 'auto', mb: 2, opacity: 0.9 }} />
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        This page took the day off
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        We couldn't find what you were looking for. The link may be old or mistyped.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {me ? (
          <Button component={RouterLink} to="/" variant="contained">
            Back to the dashboard
          </Button>
        ) : (
          <>
            <Button component={RouterLink} to="/" variant="contained">
              Go to the home page
            </Button>
            <Button component={RouterLink} to="/tools" variant="outlined">
              Free calculators
            </Button>
            <Button component={RouterLink} to="/blog" variant="outlined">
              Blog
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
