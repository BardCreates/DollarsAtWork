import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import mascot from '../../assets/mascot.png';
import { signUpPath } from '../../lib/signUp';
import type { PostCta } from './ctas';

/**
 * The compact ask partway through a post: one line of why, one main button. Visitors are asked to start a plan
 * (the sign-up remembers this post); signed-in readers get a link to try it in their own plan.
 */
export function PostCtaCard({ cta, slug, signedIn }: { cta: PostCta; slug: string; signedIn: boolean }) {
  return (
    <Card component="aside" aria-label="Try it" sx={{ my: 1, outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main', bgcolor: 'background.default' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 44, height: 'auto', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>
            {cta.headline}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {signedIn ? 'Try it with your own numbers in your plan.' : '30 days free. No card needed. No bank login.'}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to={signedIn ? cta.inApp.to : signUpPath(`blog/${slug}`)}
          variant="contained"
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          {signedIn ? cta.inApp.label : cta.button}
        </Button>
      </CardContent>
    </Card>
  );
}
