import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Link, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import mascot from '../../assets/mascot.png';
import { useMe } from '../../auth/auth';
import { PublicLayout } from './PublicLayout';
import { signUpPath } from '../../lib/signUp';
import { SITE } from './siteInfo';
import { usePageMeta } from '../../lib/usePageMeta';

/**
 * Every statement on this page describes something the code does today. Keep it that way: if a claim stops being
 * true, or a new one is added, change the code and this page together.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Point({ children, tone = 'yes' }: { children: ReactNode; tone?: 'yes' | 'no' }) {
  return (
    <Box component="li" sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
      {tone === 'yes' ? (
        <CheckIcon color="primary" fontSize="small" sx={{ mt: 0.25, flexShrink: 0 }} />
      ) : (
        <CloseIcon color="error" fontSize="small" sx={{ mt: 0.25, flexShrink: 0 }} />
      )}
      <Typography>{children}</Typography>
    </Box>
  );
}

const List = ({ children }: { children: ReactNode }) => (
  <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.25 }}>
    {children}
  </Box>
);

export function SecurityPage() {
  usePageMeta('Private by design', 'No bank login, no ad trackers. What Dollars at Work keeps, how it is protected, and how to take it with you.');
  const { data: me } = useMe();

  return (
    <PublicLayout>
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 96, height: 'auto', mb: 2 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' }, mb: 1.5 }}>
          Private by design
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', fontSize: '1.1rem' }}>
          Dollars at Work never asks for your bank login. You tell it your numbers, and it shows you where they lead.
        </Typography>
      </Box>

      <Section title="What we never ask for">
        <List>
          <Point tone="no">Your bank, card or brokerage login. There is no account linking of any kind.</Point>
          <Point tone="no">Your account numbers, card numbers or Social Security number.</Point>
          <Point tone="no">Your transactions. We don't track what you spend, only the plan you set.</Point>
        </List>
      </Section>

      <Section title="What we do keep">
        <List>
          <Point>Your email address, and a scrambled (hashed) version of your password. We can't read your password.</Point>
          <Point>The numbers you type in: your income, categories, goals, debts, accounts and monthly check-ins.</Point>
          <Point>Whether you're on a trial or subscribed. Your card details go straight to Stripe and never reach us.</Point>
        </List>
      </Section>

      <Section title="How your account is protected">
        <List>
          <Point>Everything is sent over an encrypted (HTTPS) connection.</Point>
          <Point>You stay signed in with a cookie that scripts on a page can't read, and that is only ever sent to us.</Point>
          <Point>Five wrong passwords lock sign-in for 15 minutes, and sign-in attempts are rate-limited.</Point>
          <Point>Every request is tied to your signed-in account. Nothing you can type into the address bar will show you someone else's numbers.</Point>
          <Point>Password-reset and email-change links expire and work once, and our pages never pass their address on to another site.</Point>
          <Point>Other sites can't load our pages inside a frame of their own, so nobody can dress up a fake screen around your account.</Point>
          <Point>Our typefaces are served from our own site. Opening a page here tells no third party you visited.</Point>
          <Point>
            We count how many people open our public pages and use the calculators with an anonymous event of our own: its name, the time and the referral
            tag if the address had one. No cookie, no IP address, no user id, no analytics scripts.
          </Point>
        </List>
      </Section>

      <Section title="Payments">
        <Typography>
          Subscribing happens on Stripe's own secure page. We store only whether you're subscribed, not your card.
        </Typography>
      </Section>

      <Section title="It's your data">
        <List>
          <Point>Download everything you've entered, as spreadsheets or JSON, any time from your profile.</Point>
          <Point>Delete your account from your profile. Everything you entered is removed straight away, and any subscription is canceled.</Point>
          <Point>We don't sell your data, share it for advertising, or use it to train AI models.</Point>
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          The details are in our{' '}
          <Link component={RouterLink} to="/privacy">
            Privacy Policy
          </Link>
          .
        </Typography>
      </Section>

      <Section title="Found a problem?">
        <Typography>
          If you think you've found a security issue, please email {SITE.contact}. We'll read it, and we'll tell you what we did about it.
        </Typography>
      </Section>

      <Card sx={{ outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Typography sx={{ flex: 1 }}>See how it works with a made-up plan first, or start your own. No card, no bank login.</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button component={RouterLink} to={me ? '/' : signUpPath('security')} variant="contained">
              {me ? 'Go to your dashboard' : 'Start your free trial'}
            </Button>
            <Button component={RouterLink} to="/demo" variant="outlined">
              See a sample plan
            </Button>
          </Box>
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
