import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Link } from '@mui/material';
import { Wordmark } from '../../components/Wordmark';
import { useMe } from '../../auth/auth';

/** Links shown at the bottom of every page, signed in or not. */
export function FooterLinks() {
  return (
    <Box component="footer" sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2.5, py: 3 }}>
      {[
        { to: '/pricing', label: 'Pricing' },
        { to: '/terms', label: 'Terms' },
        { to: '/privacy', label: 'Privacy' },
      ].map((link) => (
        <Link key={link.to} component={RouterLink} to={link.to} variant="body2" color="text.secondary" underline="hover">
          {link.label}
        </Link>
      ))}
    </Box>
  );
}

/** Frame for pages anyone can read: pricing, terms, privacy. */
export function PublicLayout({ children, maxWidth = 'md' }: { children: ReactNode; maxWidth?: 'sm' | 'md' | 'lg' }) {
  const { data: me } = useMe();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% 0%, rgba(25,195,125,0.12) 0%, rgba(24,26,32,0) 55%)' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 2 }}>
        <Box component={RouterLink} to={me ? '/' : '/pricing'} sx={{ textDecoration: 'none', display: 'flex', minWidth: 0 }} aria-label="Dollars at Work home">
          <Wordmark />
        </Box>
        {me ? (
          <Button component={RouterLink} to="/" variant="outlined" sx={{ flexShrink: 0 }}>
            Dashboard
          </Button>
        ) : (
          <Button component={RouterLink} to="/sign-in" variant="outlined" sx={{ flexShrink: 0 }}>
            Sign in
          </Button>
        )}
      </Container>
      <Container component="main" maxWidth={maxWidth} sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
      <FooterLinks />
    </Box>
  );
}
