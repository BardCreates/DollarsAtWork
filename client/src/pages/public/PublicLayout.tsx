import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { signUpPath, sourceFromPath } from '../../lib/signUp';
import { Box, Button, Container, Divider, IconButton, Link, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
        { to: '/affiliates', label: 'Affiliates' },
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

/**
 * The visitor's way around on a phone or tablet, where the links don't fit in the header: one small menu
 * with the same links (and Sign in on the narrowest screens, so "Start free" always has room).
 */
function VisitorMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        aria-controls={anchor ? 'visitor-menu' : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: { xs: 'inline-flex', md: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      <Menu id="visitor-menu" anchorEl={anchor} open={!!anchor} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {visitorLinks.map((link) => (
          <MenuItem key={link.to} component={RouterLink} to={link.to} onClick={close}>
            {link.label}
          </MenuItem>
        ))}
        <Divider sx={{ display: { sm: 'none' } }} />
        <MenuItem component={RouterLink} to="/sign-in" onClick={close} sx={{ display: { sm: 'none' } }}>
          Sign in
        </MenuItem>
      </Menu>
    </>
  );
}

/** Frame for pages anyone can read: home, pricing, terms, privacy, help. */
export function PublicLayout({ children, maxWidth = 'md' }: { children: ReactNode; maxWidth?: 'sm' | 'md' | 'lg' }) {
  const { data: me } = useMe();
  const { pathname } = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% 0%, rgba(25,195,125,0.12) 0%, rgba(24,26,32,0) 55%)' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: { xs: 1, sm: 2 }, py: 2 }}>
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', display: 'flex', minWidth: 0 }} aria-label="Dollars at Work home">
          <Wordmark roomy={!!me} />
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
              <Button component={RouterLink} to="/sign-in" variant="outlined" sx={{ minWidth: 0, px: { xs: 1.25, sm: 2.5 }, display: { xs: 'none', sm: 'inline-flex' } }}>
                Sign in
              </Button>
              <Button component={RouterLink} to={signUpPath(sourceFromPath(pathname))} variant="contained" size="medium" sx={{ minWidth: 0, px: { xs: 1.25, sm: 2.5 }, whiteSpace: 'nowrap' }}>
                Start free
              </Button>
              <VisitorMenu />
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
