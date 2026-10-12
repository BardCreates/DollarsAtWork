import { Box, Typography } from '@mui/material';
import mascot from '../assets/mascot.png';
import { brand } from '../theme';

/** Mascot + "Dollars at Work" in the brand font. */
export function Wordmark({ size = 'medium' }: { size?: 'medium' | 'large' }) {
  const large = size === 'large';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: large ? 1.5 : 1.25, userSelect: 'none' }}>
      <Box
        component="img"
        src={mascot}
        alt=""
        sx={{ height: large ? 72 : { xs: 40, sm: 48 }, width: 'auto' }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: brand.wordmarkFont,
          color: 'primary.main',
          letterSpacing: 1.5,
          lineHeight: 1.1,
          pt: '4px',
          fontSize: large ? '2.1rem' : { xs: '1.25rem', sm: '1.6rem', md: '1.8rem' },
          textShadow: '0 2px 8px rgba(25,195,125,0.12)',
          whiteSpace: 'nowrap',
        }}
      >
        Dollars at Work
      </Typography>
    </Box>
  );
}
