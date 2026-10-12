import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { formatMoney } from '../lib/money';

/** Opens every module: the monthly amount comes from the plan and is only ever edited there. */
export function PlanAmountBanner({ amount }: { amount: number }) {
  return (
    <Alert
      severity="success"
      icon={false}
      sx={{ mb: 3 }}
      action={
        <Button component={RouterLink} to="/plan" color="inherit" size="small">
          Edit in Plan
        </Button>
      }
    >
      <strong>{formatMoney(amount)}/month</strong> from your plan
    </Alert>
  );
}
