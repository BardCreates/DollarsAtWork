import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { TopBar, TOP_BAR_HEIGHT } from './TopBar';
import { TrialBanner } from './TrialBanner';
import { FooterLinks } from '../pages/public/PublicLayout';

/** Frame for every signed-in page: fixed top bar, trial banner, page content (the route's, unless given). */
export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar />
      <Box component="main" sx={{ pt: `${TOP_BAR_HEIGHT}px` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
          <TrialBanner />
          {children ?? <Outlet />}
        </Container>
        <FooterLinks />
      </Box>
    </Box>
  );
}
