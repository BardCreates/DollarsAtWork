import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useMe } from '../auth/auth';
import { formatMoney } from '../lib/money';
import { planTotals, usePlan, useSetModuleAmount, type CategoryKind } from '../features/plan/plan';
import { MoneyField } from './MoneyField';

/**
 * Opens every module with its monthly amount. The amount lives in the plan; with `kind` given, it can be changed right
 * here and the change is saved to that built-in category, the same as typing it on the Plan page.
 */
export function PlanAmountBanner({ amount, kind }: { amount: number; kind?: Exclude<CategoryKind, 'Custom'> }) {
  if (!kind) return <ReadOnlyBanner amount={amount} />;
  return <EditableBanner amount={amount} kind={kind} />;
}

function ReadOnlyBanner({ amount }: { amount: number }) {
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

function EditableBanner({ amount, kind }: { amount: number; kind: Exclude<CategoryKind, 'Custom'> }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const { data: plan } = usePlan();
  const module = useSetModuleAmount(kind);
  // The plan is the truth as soon as it loads; the module's own copy covers the moment before.
  const shown = module.category?.amount ?? amount;
  const remaining = plan ? planTotals(plan).remaining : 0;

  return (
    <Alert severity={remaining < 0 ? 'warning' : 'success'} icon={false} sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 140 }}>
          <MoneyField
            value={shown}
            percentOf={plan?.monthlyIncome}
            ariaLabel={`${kind === 'Investment' ? 'Investments' : kind} amount per month`}
            disabled={readOnly || !module.category}
            onCommit={module.set}
          />
        </Box>
        <Typography component="span">
          a month from your plan{module.isPending ? ', saving…' : ''}
        </Typography>
        <Button component={RouterLink} to="/plan" color="inherit" size="small" sx={{ ml: 'auto' }}>
          Open Plan
        </Button>
      </Box>
      {remaining < 0 && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Your categories now add up to {formatMoney(-remaining)} more than your income. Take it from another category on the Plan page so every
          dollar has one job.
        </Typography>
      )}
    </Alert>
  );
}
