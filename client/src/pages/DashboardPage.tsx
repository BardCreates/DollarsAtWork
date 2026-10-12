import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import mascot from '../assets/mascot.png';
import { PageHeader } from '../components/PageHeader';
import { useMe } from '../auth/auth';

export function DashboardPage() {
  const { data: me } = useMe();

  return (
    <>
      <PageHeader title="Dashboard" subtitle={me ? `Welcome, ${me.email}` : undefined} />
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4, p: { xs: 3, md: 5 } }}>
          <Box component="img" src={mascot} alt="" sx={{ width: 160, height: 'auto' }} />
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Let's put your dollars to work
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
              Your net worth, the years slider and the charts appear here once your plan is set up. Start by entering your
              monthly income and splitting it into categories.
            </Typography>
            <Button component={RouterLink} to="/plan" variant="contained" size="large">
              Set up your plan
            </Button>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
