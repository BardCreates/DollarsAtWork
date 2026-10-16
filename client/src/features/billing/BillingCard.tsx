import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { errorMessage } from '../../api/client';
import type { Access, SubscriptionStatus } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { brand } from '../../theme';
import { useOpenPortal, usePrices, useStartCheckout, useSyncBilling, type BillingPlan, type Prices } from './billing';

const statusLabel: Record<SubscriptionStatus, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
  Trialing: { label: 'Free trial', color: 'info' },
  Active: { label: 'Active', color: 'success' },
  PastDue: { label: 'Payment due', color: 'warning' },
  Canceled: { label: 'Canceled', color: 'default' },
  Expired: { label: 'Expired', color: 'error' },
};

const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

/** The subscription section of the Profile page: where you subscribe, and where you manage it afterwards. */
export function BillingCard({ access }: { access: Access }) {
  const prices = usePrices();
  const checkout = useStartCheckout();
  const portal = useOpenPortal();
  const sync = useSyncBilling();

  const [params, setParams] = useSearchParams();
  const [returnedWith, setReturnedWith] = useState<string | null>(null);
  const handledReturn = useRef(false);

  // Back from Stripe (?billing=success|canceled|updated): refresh the status once, then tidy the address bar.
  useEffect(() => {
    const result = params.get('billing');
    if (!result || handledReturn.current) return;
    handledReturn.current = true;
    setReturnedWith(result);
    setParams({}, { replace: true });
    if (result === 'canceled') return;
    sync.mutate(undefined, {
      onSuccess: (updated) => {
        if (result === 'success' && updated.status === 'Active') {
          confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 }, colors: [brand.green, brand.yellow, brand.pink, brand.blue] });
        }
      },
    });
  }, [params]);

  const status = statusLabel[access.status];
  const leaving = checkout.isPending || checkout.isSuccess || portal.isPending || portal.isSuccess;
  const failure = checkout.error ?? portal.error ?? sync.error;
  const planName = access.billingInterval === 'year' ? 'Annual plan' : access.billingInterval === 'month' ? 'Monthly plan' : null;

  const manageButton = (label: string, variant: 'contained' | 'outlined' = 'outlined') => (
    <Button variant={variant} disabled={leaving} onClick={() => portal.mutate()}>
      {label}
    </Button>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography variant="h6">Subscription</Typography>
          <Chip size="small" color={status.color} label={status.label} />
          {sync.isPending && <CircularProgress size={16} />}
        </Box>

        {returnedWith === 'success' && !sync.isPending && (
          <Alert severity={access.status === 'Active' ? 'success' : 'info'} sx={{ mb: 2 }}>
            {access.status === 'Active'
              ? "You're subscribed. Thank you! Everything stays unlocked."
              : "Thanks! Your payment is being confirmed. This page will show Active in a moment; refresh if it doesn't."}
          </Alert>
        )}
        {returnedWith === 'canceled' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Checkout was canceled. Nothing was charged.
          </Alert>
        )}
        {failure && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(failure)}
          </Alert>
        )}

        {access.status === 'Active' && (
          <>
            <Typography sx={{ mb: 2 }}>
              {planName ?? 'Subscribed'}
              {access.currentPeriodEnd ? ` · renews ${longDate(access.currentPeriodEnd)}` : ''}
            </Typography>
            {manageButton('Manage billing')}
          </>
        )}

        {access.status === 'PastDue' && (
          <>
            <Typography sx={{ mb: 2 }}>Your last payment didn't go through. Update your card within 7 days and nothing changes.</Typography>
            {manageButton('Update your card', 'contained')}
          </>
        )}

        {access.status === 'Canceled' && (
          <>
            <Typography sx={{ mb: 2 }}>
              Your subscription ends on {access.currentPeriodEnd ? longDate(access.currentPeriodEnd) : 'the end of this period'}. You keep full access until then.
            </Typography>
            {manageButton('Resubscribe', 'contained')}
          </>
        )}

        {(access.status === 'Trialing' || access.status === 'Expired') && (
          <>
            <Typography sx={{ mb: 2 }}>
              {access.status === 'Trialing'
                ? `Your free trial ends on ${longDate(access.trialEndsAt)} (${access.trialDaysLeft === 1 ? '1 day' : `${access.trialDaysLeft} days`} left). Subscribe any time; no card is needed until you do.`
                : "Your access has ended, but nothing's lost. Everything is still here to look at, and subscribing turns editing back on."}
            </Typography>
            <PlanPicker prices={prices.data} loading={prices.isPending} failed={prices.isError} disabled={leaving} onSubscribe={(plan) => checkout.mutate(plan)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlanPicker({
  prices,
  loading,
  failed,
  disabled,
  onSubscribe,
}: {
  prices: Prices | undefined;
  loading: boolean;
  failed: boolean;
  disabled: boolean;
  onSubscribe: (plan: BillingPlan) => void;
}) {
  const foundingOpen = !!prices?.founding?.open;
  const [chosen, setChosen] = useState<BillingPlan | null>(null);
  // The founding offer is the best deal while it lasts, so it's picked unless the person picks something else.
  const plan: BillingPlan = chosen ?? (foundingOpen ? 'founding' : 'annual');

  if (loading) return <CircularProgress size={20} />;
  if (failed) return <Alert severity="warning">We couldn't load the prices. Refresh to try again.</Alert>;
  if (!prices?.enabled || !prices.monthly || !prices.annual) {
    return <Alert severity="info">Subscribing isn't available yet. Your trial gives you full access until it is.</Alert>;
  }

  const { monthly, annual, founding } = prices;
  const yearOfMonthly = monthly.amount * 12;
  const saving = yearOfMonthly - annual.amount;
  const spotsLeft = founding ? founding.limit - founding.taken : 0;

  return (
    <>
      <ToggleButtonGroup exclusive color="primary" value={plan} onChange={(_, value: BillingPlan | null) => value && setChosen(value)} aria-label="Plan" sx={{ mb: 2, flexWrap: 'wrap' }}>
        {founding && foundingOpen && (
          <ToggleButton value="founding" sx={{ px: 2.5, textAlign: 'left', display: 'block' }}>
            <Typography component="span" sx={{ display: 'block', fontWeight: 600 }}>
              Founding · {formatMoney(founding.price.amount)}/year
            </Typography>
            <Typography component="span" variant="caption" sx={{ display: 'block' }}>
              {spotsLeft === 1 ? 'Last spot left' : `${spotsLeft} of ${founding.limit} spots left`}
            </Typography>
          </ToggleButton>
        )}
        <ToggleButton value="annual" sx={{ px: 2.5, textAlign: 'left', display: 'block' }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 600 }}>
            Annual · {formatMoney(annual.amount)}/year
          </Typography>
          <Typography component="span" variant="caption" sx={{ display: 'block' }}>
            {saving > 0 ? `Save ${formatMoney(saving)} a year` : `${formatMoney(annual.amount / 12, { cents: true })}/month`}
          </Typography>
        </ToggleButton>
        <ToggleButton value="monthly" sx={{ px: 2.5, textAlign: 'left', display: 'block' }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 600 }}>
            Monthly · {formatMoney(monthly.amount)}/month
          </Typography>
          <Typography component="span" variant="caption" sx={{ display: 'block' }}>
            Cancel any time
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>
      <Box>
        <Button variant="contained" size="large" disabled={disabled} onClick={() => onSubscribe(plan)}>
          {disabled ? 'Opening checkout…' : 'Subscribe'}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          You'll enter your card on Stripe's secure page. We never see or store it. Have a promotion code? You can add it there.
        </Typography>
      </Box>
    </>
  );
}
