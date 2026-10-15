import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Divider, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { WaitlistForm } from '../waitlist/WaitlistForm';
import type { WaitlistSource } from '../waitlist/waitlist';

/**
 * The close of every public calculator and of the demo: take the numbers you just played with
 * and put your own in. Only ever shown to visitors who aren't signed in.
 */
export function TrialCta({ headline, body, showDemoLink = true, source = 'tools' }: { headline: string; body: string; showDemoLink?: boolean; source?: WaitlistSource }) {
  return (
    <Card sx={{ mt: 4, outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
      <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3, p: { xs: 2.5, md: 3 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 72, height: 'auto', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6">{headline}</Typography>
          <Typography color="text.secondary">{body}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, flexShrink: 0 }}>
          <Button component={RouterLink} to="/sign-up" variant="contained" size="large">
            Start your free trial
          </Button>
          {showDemoLink && (
            <Button component={RouterLink} to="/demo" variant="outlined" size="large">
              See a sample plan
            </Button>
          )}
        </Box>
      </CardContent>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: { xs: 2.5, md: 3 }, pb: 2 }}>
        30 days of full access. No card needed.
      </Typography>
      <Divider />
      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2.5 }}>
        <WaitlistForm source={source} />
      </Box>
    </Card>
  );
}
