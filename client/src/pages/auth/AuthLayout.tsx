import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Wordmark } from '../../components/Wordmark';
import { FooterLinks } from '../public/PublicLayout';

/** Centered card with the mascot, used by every signed-out page. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: 'radial-gradient(circle at 50% 0%, rgba(25,195,125,0.12) 0%, rgba(24,26,32,0) 55%)',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Wordmark size="large" />
      </Box>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" component="h1" sx={{ mb: subtitle ? 0.5 : 3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          )}
          {children}
        </CardContent>
      </Card>
      {footer && <Box sx={{ mt: 3, textAlign: 'center' }}>{footer}</Box>}
      <FooterLinks />
    </Box>
  );
}
