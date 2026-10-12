import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

/** One summary number at the top of a module page: small label, big value, optional note. */
export function Figure({ label, value, note, color = 'text.primary' }: { label: string; value: string; note?: ReactNode; color?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" color={color} sx={{ fontVariantNumeric: 'tabular-nums' }} noWrap>
        {value}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      )}
    </Box>
  );
}
