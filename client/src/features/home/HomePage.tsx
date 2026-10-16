import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalculateIcon from '@mui/icons-material/Calculate';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LockIcon from '@mui/icons-material/Lock';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import mascot from '../../assets/mascot.png';
import { usePrices } from '../billing/billing';
import { formatMoney } from '../../lib/money';
import { signUpPath } from '../../lib/signUp';
import { PublicLayout } from '../../pages/public/PublicLayout';
import { SampleImpactCard, useSampleImpact } from '../demo/SampleImpactCard';
import { WaitlistForm } from '../waitlist/WaitlistForm';
import { useRecordVisit } from '../../lib/usage';
import { usePageMeta } from '../../lib/usePageMeta';

const steps = [
  { title: 'Give every dollar a job', body: 'Enter your take-home pay and split it into categories, including Savings, Debt and Investments.' },
  { title: 'Put each job to work', body: 'Add your goals, debts and accounts. Each one gets its share of your plan automatically.' },
  { title: 'See where it leads', body: 'Your debt-free date, when each goal is reached, and your net worth up to 40 years out.' },
];

const features: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <TaskAltIcon />, title: 'Move a dollar', body: 'Change any amount in your plan and watch your debt-free date and future net worth move as you type.' },
  { icon: <AccountBalanceIcon />, title: 'Debt-free date', body: 'Snowball, avalanche or your own order, with every payment scheduled and the interest you save.' },
  { icon: <SavingsIcon />, title: 'Savings goals', body: 'Goals that fill in order and tell you whether you are on track for the date you want.' },
  { icon: <ShowChartIcon />, title: 'Investing and match', body: 'Your 401(k), IRA and brokerage accounts projected forward, employer match included.' },
  { icon: <CompareArrowsIcon />, title: 'What-if plans', body: 'Try up to 3 different plans side by side without touching your real one.' },
  { icon: <EventAvailableIcon />, title: 'Monthly check-in', body: 'A one-minute update of your balances and a one-screen report card of your month.' },
];

/**
 * The front door for visitors who aren't signed in: what Dollars at Work does, a live taste of it on the
 * sample plan, and the ways in (trial, sign in, calculators, help, or the waitlist).
 */
export function HomePage() {
  usePageMeta('Dollars at Work', 'A monthly money plan that shows your debt-free date, savings goals and net worth 10 years out. No bank login.');
  useRecordVisit('visit_home');
  const { extra, setExtra, result, impact } = useSampleImpact();
  const { data: prices } = usePrices();
  const monthly = prices?.enabled ? prices.monthly : null;
  const annual = prices?.enabled ? prices.annual : null;

  return (
    <PublicLayout maxWidth="lg">
      {/* Hero */}
      <Box
        component="section"
        sx={{ display: 'grid', gap: { xs: 4, md: 6 }, alignItems: 'center', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.1fr) minmax(0, 1fr)' }, mb: { xs: 6, md: 9 } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2.1rem', md: '3rem' }, lineHeight: 1.15, mb: 2 }}>
            Plan your money. <Box component="span" sx={{ color: 'primary.main' }}>See your future.</Box>
          </Typography>
          <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400, mb: 3, maxWidth: 560 }}>
            Dollars at Work turns this month's plan into your debt-free date and your net worth years from now. Change one number and watch your future move.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
            <Button component={RouterLink} to={signUpPath('home')} variant="contained" size="large">
              Start your free trial
            </Button>
            <Button component={RouterLink} to="/demo" variant="outlined" size="large">
              See a sample plan
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            30 days free. No card needed. No bank login, ever.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Already have an account?{' '}
            <Box component={RouterLink} to="/sign-in" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Sign in
            </Box>
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <SampleImpactCard extra={extra} onExtraChange={setExtra} result={result} impact={impact} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            A made-up example running the real projection engine. Estimates, not financial advice.
          </Typography>
        </Box>
      </Box>

      {/* How it works */}
      <Box component="section" sx={{ mb: { xs: 6, md: 9 } }}>
        <Typography variant="h4" component="h2" sx={{ mb: 3, textAlign: { md: 'center' } }}>
          How it works
        </Typography>
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } }}>
          {steps.map((step, i) => (
            <Card key={step.title}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h4" component="p" color="primary.main" sx={{ mb: 1 }}>
                  {i + 1}
                </Typography>
                <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography color="text.secondary">{step.body}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Features */}
      <Box component="section" sx={{ mb: { xs: 6, md: 9 } }}>
        <Typography variant="h4" component="h2" sx={{ mb: 3, textAlign: { md: 'center' } }}>
          Everything in one plan
        </Typography>
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
          {features.map((feature) => (
            <Box key={feature.title} sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
              <Box sx={{ color: 'primary.main', pt: 0.25 }}>{feature.icon}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Private, free tools, help */}
      <Box component="section" sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' }, mb: { xs: 6, md: 9 } }}>
        {[
          { to: '/security', icon: <LockIcon />, title: 'Private by design', body: 'No bank login, no tracking, no selling your data. You type in your numbers; you can export or delete them any time.' },
          { to: '/tools', icon: <CalculateIcon />, title: 'Free calculators', body: 'Early payoff, loan comparison, compound interest, DRIP and the cost of a habit. No account needed.' },
          { to: '/help', icon: <HelpOutlineIcon />, title: 'Help guide', body: 'How everything works, in plain words, with a search box for the question you have.' },
        ].map((card) => (
          <Card key={card.to}>
            <CardActionArea component={RouterLink} to={card.to} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ color: 'primary.main', mb: 1 }}>{card.icon}</Box>
                <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.body}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* Close: trial + waitlist */}
      <Card component="section" sx={{ outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main', mb: 2 }}>
        <CardContent sx={{ display: 'grid', gap: 4, p: { xs: 3, md: 4 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', minWidth: 0 }}>
            <Box component="img" src={mascot} alt="" sx={{ width: 72, height: 'auto', flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
                Put your dollars to work
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                It takes about three minutes to see your own 10-year number.
                {monthly && annual ? ` After your free month, it's ${formatMoney(monthly.amount)} a month or ${formatMoney(annual.amount)} a year.` : ''}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={RouterLink} to={signUpPath('home')} variant="contained" size="large">
                  Start your free trial
                </Button>
                <Button component={RouterLink} to="/pricing" variant="outlined" size="large">
                  See pricing
                </Button>
              </Box>
            </Box>
          </Box>
          <WaitlistForm source="home" />
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        Dollars at Work shows estimates based on the numbers you enter and assumed returns. It is not financial advice.
      </Typography>
    </PublicLayout>
  );
}
