import { Box, Card, CardContent, Typography } from '@mui/material';
import mascot from '../assets/mascot.png';
import { PageHeader } from './PageHeader';

/** Placeholder for modules that later build phases fill in. */
export function ComingSoon({ title, subtitle, phase, points }: { title: string; subtitle: string; phase: string; points: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 3, md: 4 } }}>
          <Box component="img" src={mascot} alt="" sx={{ width: 120, height: 'auto', flexShrink: 0 }} />
          <Box>
            <Typography variant="overline" color="warning.main">
              Under construction · {phase}
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Coming next
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
              {points.map((point) => (
                <li key={point}>
                  <Typography variant="body2">{point}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
