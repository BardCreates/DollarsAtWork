import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

/** Title row used at the top of every module page. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2, mb: 3 }}>
      <Box sx={{ flex: 1, minWidth: 240 }}>
        <Typography variant="h4" component="h1" color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions}
    </Box>
  );
}
