import { useState } from 'react';
import { NavLink, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import { Wordmark } from '../components/Wordmark';
import { useMe, useSignOut } from '../auth/auth';
import { brand } from '../theme';

export const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Plan', to: '/plan' },
  { label: 'Savings', to: '/savings' },
  { label: 'Debt', to: '/debt' },
  { label: 'Invest', to: '/invest' },
  { label: 'What if', to: '/what-if' },
  { label: 'Tools', to: '/tools' },
] as const;

export const TOP_BAR_HEIGHT = 72;

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const signOut = useSignOut();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const handleSignOut = () => {
    setAccountAnchor(null);
    signOut.mutate(undefined, { onSettled: () => navigate('/sign-in', { replace: true }) });
  };

  return (
    <AppBar position="fixed" elevation={2} sx={{ backgroundImage: brand.headerGradient, backgroundColor: brand.surface }}>
      <Toolbar sx={{ minHeight: TOP_BAR_HEIGHT, gap: 1 }}>
        <IconButton
          color="primary"
          edge="start"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          sx={{ display: { lg: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', display: 'flex' }} aria-label="Dollars at Work home">
          <Wordmark />
        </Box>

        <Box component="nav" sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5 }}>
          {navItems.map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === '/'}
              color="primary"
              variant={isActive(pathname, item.to) ? 'outlined' : 'text'}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Tooltip title="Help">
          <IconButton component={RouterLink} to="/help" color="primary" size="large" aria-label="Help" sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }}>
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
        <IconButton
          color="primary"
          size="large"
          aria-label="Account"
          aria-haspopup="menu"
          onClick={(e) => setAccountAnchor(e.currentTarget)}
          sx={{ ml: 1 }}
        >
          <AccountCircleIcon fontSize="large" />
        </IconButton>
        <Menu
          anchorEl={accountAnchor}
          open={accountAnchor !== null}
          onClose={() => setAccountAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {me && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Signed in as
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {me.email}
              </Typography>
            </Box>
          )}
          <Divider />
          <MenuItem component={RouterLink} to="/profile" onClick={() => setAccountAnchor(null)}>
            Profile &amp; billing
          </MenuItem>
          <MenuItem component={RouterLink} to="/help" onClick={() => setAccountAnchor(null)}>
            Help
          </MenuItem>
          <MenuItem onClick={handleSignOut} disabled={signOut.isPending}>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="navigation">
          <Box sx={{ px: 2, pb: 2 }}>
            <Wordmark />
          </Box>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={isActive(pathname, item.to)}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton component={RouterLink} to="/help" selected={pathname.startsWith('/help')} onClick={() => setDrawerOpen(false)}>
              <ListItemText primary="Help" />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/blog" selected={pathname.startsWith('/blog')} onClick={() => setDrawerOpen(false)}>
              <ListItemText primary="Blog" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
