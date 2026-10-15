import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { errorMessage } from '../../api/client';
import type { HintSettings } from '../../auth/auth';
import { useSetHintsOff } from './hints';

/** Profile setting: show or hide the first-time hints. Turning them on brings back every hint, even ones closed one by one. */
export function HintsCard({ hints }: { hints: HintSettings }) {
  const setOff = useSetHintsOff();
  const on = !hints.off;
  const someClosed = on && hints.dismissed.length > 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Hints and help
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Each page shows a short hint the first time you open it. Turn them off if you know your way around, or back on to see them all again.
        </Typography>
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <FormControlLabel
            control={<Switch checked={on} disabled={setOff.isPending} onChange={(_, checked) => setOff.mutate(!checked)} />}
            label="Show hints"
          />
          {someClosed && (
            <Button size="small" variant="outlined" disabled={setOff.isPending} onClick={() => setOff.mutate(false)}>
              Show the hints I closed
            </Button>
          )}
          {setOff.isError && <Alert severity="error">{errorMessage(setOff.error)}</Alert>}
          <Button component={RouterLink} to="/help" size="small">
            Open the help guide
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
