import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, IconButton, Link, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import mascot from '../../assets/mascot.png';
import { useDismissHint, useSetHintsOff, useShowHint, type HintId } from './hints';

/**
 * A first-time hint at the top of a page: what the page is for and the first thing to try.
 * "Got it" closes this one for good; "Hide all hints" turns them all off (Profile turns them back on).
 */
export function Hint({ id, title, children, helpSlug }: { id: HintId; title: string; children: ReactNode; helpSlug?: string }) {
  const show = useShowHint(id);
  const dismiss = useDismissHint();
  const hideAll = useSetHintsOff();

  if (!show) return null;

  return (
    <Card component="aside" aria-label="Hint" sx={{ mb: 3, outline: 1, outlineStyle: 'solid', outlineColor: 'rgba(245,197,24,0.45)' }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 48, height: 'auto', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Box sx={{ color: 'text.secondary', '& p': { m: 0 }, '& p + p, & ul': { mt: 1 }, '& ul': { pl: 2.5, mb: 0 } }}>{children}</Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Button size="small" variant="contained" onClick={() => dismiss.mutate(id)}>
              Got it
            </Button>
            <Button size="small" color="inherit" onClick={() => hideAll.mutate(true)}>
              Hide all hints
            </Button>
            {helpSlug && (
              <Link component={RouterLink} to={`/help/${helpSlug}`} variant="body2" underline="hover" sx={{ ml: { sm: 'auto' } }}>
                Read the guide
              </Link>
            )}
          </Box>
        </Box>
        <Tooltip title="Close this hint">
          <IconButton size="small" aria-label="Close this hint" onClick={() => dismiss.mutate(id)} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
