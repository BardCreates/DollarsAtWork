import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import mascot from '../../assets/mascot.png';
import { useMe } from '../../auth/auth';
import { usePrices } from '../../features/billing/billing';
import { formatMoney } from '../../lib/money';
import { PublicLayout } from './PublicLayout';
import { signUpPath } from '../../lib/signUp';
import { useRecordVisit } from '../../lib/usage';

const features = [
  'A monthly plan that gives every dollar a job',
  'A debt-free date, with snowball or avalanche payoff',
  'Savings goals that fill in order and tell you if you are on track',
  'Investment growth, including your employer match',
  'Your net worth today and projected up to 40 years out',
  'Calculators for loans, compound interest and dividends',
];

const questions = [
  { q: 'Do I need a card to start?', a: 'No. The trial is 30 days of full access with no card. You only enter one if you decide to subscribe.' },
  { q: 'What happens when the trial ends?', a: "Your plan and numbers stay safe and you can still see them. Editing is turned off until you subscribe." },
  { q: 'Can I cancel?', a: 'Any time, from your profile. You keep full access until the end of the period you paid for.' },
  { q: 'Do you connect to my bank?', a: 'No, and we never will ask for your bank login. You type in your own numbers, so we never see your accounts or your transactions. The details are on our security page.' },
  { q: 'Can I get my data out?', a: 'Yes. Download everything as spreadsheets or JSON from your profile, or delete your account and all its data for good.' },
];

export function PricingPage() {
  useRecordVisit('visit_pricing');
  const { data: me } = useMe();
  const { data: prices } = usePrices();
  const monthly = prices?.enabled ? prices.monthly : null;
  const annual = prices?.enabled ? prices.annual : null;
  const saving = monthly && annual ? monthly.amount * 12 - annual.amount : 0;
  const founding = prices?.enabled && prices.founding?.open ? prices.founding : null;

  const cta = me ? { to: '/profile', label: 'Go to your subscription' } : { to: signUpPath('pricing'), label: 'Start your free 30-day trial' };

  return (
    <PublicLayout>
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 110, height: 'auto', mb: 2 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5 }}>
          Put every dollar to work
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', mb: 3, fontSize: '1.1rem' }}>
          One monthly plan for your savings, debt and investing, and a clear picture of where it takes you.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          <Button component={RouterLink} to={cta.to} variant="contained" size="large">
            {cta.label}
          </Button>
          <Button component={RouterLink} to="/demo" variant="outlined" size="large">
            See a sample plan
          </Button>
        </Box>
        {!me && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            No card needed.
          </Typography>
        )}
      </Box>

      {founding && (
        <Card sx={{ mb: 3, outline: 2, outlineStyle: 'solid', outlineColor: 'warning.main' }}>
          <CardContent sx={{ p: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6">Founding member</Typography>
                <Chip size="small" color="warning" label={`${founding.limit - founding.taken} of ${founding.limit} spots left`} />
              </Box>
              <Typography variant="h4" component="p" sx={{ my: 1 }}>
                {formatMoney(founding.price.amount)}
                <Typography component="span" color="text.secondary">
                  {' '}
                  / year
                </Typography>
              </Typography>
              <Typography color="text.secondary">
                Our launch price for the first {founding.limit} members, the same plan as Annual for less. It renews at this price for as long as you stay subscribed.
              </Typography>
            </Box>
            <Button component={RouterLink} to={cta.to} variant="contained" size="large" sx={{ flexShrink: 0 }}>
              {me ? 'Claim a founding spot' : 'Start free, then claim it'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: { xs: 4, md: 6 } }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6">Monthly</Typography>
            <Typography variant="h4" component="p" sx={{ my: 1 }}>
              {monthly ? formatMoney(monthly.amount) : '—'}
              <Typography component="span" color="text.secondary">
                {' '}
                / month
              </Typography>
            </Typography>
            <Typography color="text.secondary">Pay as you go. Cancel any time.</Typography>
          </CardContent>
        </Card>
        <Card sx={{ outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">Annual</Typography>
              {saving > 0 && <Chip size="small" color="primary" label={`Save ${formatMoney(saving)}`} />}
            </Box>
            <Typography variant="h4" component="p" sx={{ my: 1 }}>
              {annual ? formatMoney(annual.amount) : '—'}
              <Typography component="span" color="text.secondary">
                {' '}
                / year
              </Typography>
            </Typography>
            <Typography color="text.secondary">{annual ? `Works out to ${formatMoney(annual.amount / 12, { cents: true })} a month.` : 'One payment a year.'}</Typography>
          </CardContent>
        </Card>
      </Box>
      {prices && !prices.enabled && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: -2, mb: 4 }}>
          Prices are being finalized. The 30-day trial is open now.
        </Typography>
      )}

      <Card sx={{ mb: { xs: 4, md: 6 } }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Every plan includes everything
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {features.map((feature) => (
              <Box component="li" key={feature} sx={{ display: 'flex', gap: 1.25 }}>
                <CheckIcon color="primary" fontSize="small" sx={{ mt: 0.25, flexShrink: 0 }} />
                <Typography>{feature}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Questions
      </Typography>
      <Box sx={{ display: 'grid', gap: 2.5, mb: 4 }}>
        {questions.map((item) => (
          <Box key={item.q}>
            <Typography sx={{ fontWeight: 600 }}>{item.q}</Typography>
            <Typography color="text.secondary">{item.a}</Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary">
        Dollars at Work shows estimates based on the numbers you enter and assumed returns. It is not financial advice.
      </Typography>
    </PublicLayout>
  );
}
