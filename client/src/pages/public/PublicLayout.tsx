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
        { to: '/tools', label: 'Free calculators' },
        { to: '/demo', label: 'Sample plan' },
        { to: '/blog', label: 'Blog' },
        { to: '/help', label: 'Help' },
        { to: '/security', label: 'Security' },
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

const visitorLinks = [
  { to: '/tools', label: 'Calculators' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/blog', label: 'Blog' },
  { to: '/help', label: 'Help' },
];

/** Frame for pages anyone can read: home, pricing, terms, privacy, help. */
export function PublicLayout({ children, maxWidth = 'md' }: { children: ReactNode; maxWidth?: 'sm' | 'md' | 'lg' }) {
  const { data: me } = useMe();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% 0%, rgba(25,195,125,0.12) 0%, rgba(24,26,32,0) 55%)' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 2 }}>
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', display: 'flex', minWidth: 0 }} aria-label="Dollars at Work home">
          <Wordmark />
        </Box>
        <Box component="nav" sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
          {!me &&
            visitorLinks.map((link) => (
              <Button key={link.to} component={RouterLink} to={link.to} color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                {link.label}
              </Button>
            ))}
          {me ? (
            <Button component={RouterLink} to="/" variant="outlined" sx={{ minWidth: 0, px: { xs: 1.25, sm: 2.5 } }}>
              Open app
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to="/sign-in" variant="outlined" sx={{ minWidth: 0, px: { xs: 1.25, sm: 2.5 } }}>
                Sign in
              </Button>
              <Button component={RouterLink} to="/sign-up" variant="contained" sx={{ minWidth: 0, px: { xs: 1.25, sm: 2.5 }, display: { xs: 'none', sm: 'inline-flex' } }}>
                Start free
              </Button>
            </>
          )}
        </Box>
      </Container>
      <Container component="main" maxWidth={maxWidth} sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
      <FooterLinks />
    </Box>
  );
}
