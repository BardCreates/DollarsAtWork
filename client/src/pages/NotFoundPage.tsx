import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import mascot from '../assets/mascot.png';

export function NotFoundPage() {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Box component="img" src={mascot} alt="" sx={{ width: 140, height: 'auto', mb: 2, opacity: 0.9 }} />
      <Typography variant="h5" sx={{ mb: 1 }}>
        This page took the day off
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        We couldn't find what you were looking for.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Back to the dashboard
      </Button>
    </Box>
  );
}
