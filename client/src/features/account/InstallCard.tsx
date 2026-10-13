import { Button, Card, CardContent, Typography } from '@mui/material';
import { useInstallPrompt } from '../../lib/installPrompt';

/** Offered only when the browser says the app can be installed, so it never shows a button that does nothing. */
export function InstallCard() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Put it on your home screen
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Install Dollars at Work to open it like any other app, in its own window, one tap from your home screen or desktop.
        </Typography>
        <Button variant="outlined" onClick={() => void install()}>
          Install the app
        </Button>
      </CardContent>
    </Card>
  );
}
