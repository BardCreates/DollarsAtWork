import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PercentIcon from '@mui/icons-material/Percent';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import mascot from '../../assets/mascot.png';
import { errorMessage } from '../../api/client';
import { muiField } from '../../components/formHelpers';
import { affiliateNote, useJoinWaitlist } from '../../features/waitlist/waitlist';
import { PublicLayout } from './PublicLayout';
import { SITE } from './siteInfo';
import { usePageMeta } from '../../lib/usePageMeta';

/**
 * The page outreach emails point creators and coaches to: the offer, how it works, what we ask, and a box to ask
 * for a link. The request goes to the waitlist table with source "affiliates" and a note; Hannah sends the link by hand.
 */

const offer: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <CardGiftcardIcon />, title: 'A free account for you', body: 'Full access to Dollars at Work, for as long as you want it. No card, no trial clock.' },
  { icon: <PercentIcon />, title: '30% of every subscription', body: 'From anyone who signs up through your link, for their first 12 months. Paid monthly.' },
  { icon: <HourglassEmptyIcon />, title: 'A free month for your audience', body: 'Everyone gets a 30-day trial with no card. Nobody is pushed to pay just to try it.' },
];

const steps = [
  { title: 'Ask for a link', body: 'Fill in the box at the bottom of this page. Hannah emails your link within two days.' },
  { title: 'Share it', body: 'Your link carries ?from=your-name. When someone arrives through it and signs up during that visit, we record that on their account.' },
  {
    title: 'Get paid monthly',
    body: 'Each month we pay out your share of the previous month’s active subscriptions, by PayPal or bank transfer, once your balance reaches $20.',
  },
];

const asks = [
  'Say it’s a paid partnership wherever you share the link. One line is enough, such as "I earn a commission if you subscribe."',
  'Don’t promise results from the app. It shows estimates based on what a person enters, and estimates are estimates.',
  'Don’t run ads on our brand name.',
];

const questions = [
  { q: 'When do I get paid?', a: 'Once a month, for the previous month’s active subscriptions, as soon as your balance reaches $20. By PayPal or bank transfer, whichever you prefer.' },
  {
    q: 'What counts as "from my link"?',
    a: 'A sign-up that happens in the same visit as a click on your link. The from tag is held in that browser tab until it closes, then saved on the new account. It is not a cookie, so a person who leaves and comes back later without your link does not count. No pixels either.',
  },
  {
    q: 'Can my audience get a discount?',
    a: 'Not a code of their own. Checkout accepts codes, but we use them only for partner accounts like yours, and there are no public discounts. What your audience gets is the 30-day free trial, no card needed, and the founding price while spots last.',
  },
  { q: 'How do I stop?', a: `Email ${SITE.contact} any time. We take your link down and pay out whatever you’re owed.` },
];

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(60, 'Keep your name to 60 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.'),
  where: z.string().trim().min(1, 'Tell us where you share.').max(120, 'Keep it to 120 characters or fewer.'),
});
type FormValues = z.infer<typeof schema>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mb: { xs: 5, md: 6 } }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function AskForLink() {
  const join = useJoinWaitlist();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', where: '' } });

  if (join.isSuccess) {
    return <Alert severity="success">Thanks — Hannah will email your link within two days.</Alert>;
  }

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(({ name, email, where }) => join.mutate({ email, source: 'affiliates', note: affiliateNote(name, where) }))}
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' } }}
    >
      <TextField label="Your name" autoComplete="name" {...muiField(register, 'name')} error={!!errors.name} helperText={errors.name?.message} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        {...muiField(register, 'email')}
        error={!!errors.email || join.isError}
        helperText={errors.email?.message ?? (join.isError ? errorMessage(join.error) : undefined)}
      />
      <TextField
        label="Where you share"
        placeholder="YouTube, 60K"
        {...muiField(register, 'where')}
        error={!!errors.where}
        helperText={errors.where?.message ?? 'A channel, newsletter, podcast or practice, and roughly how many people.'}
        sx={{ gridColumn: { sm: '1 / -1' } }}
      />
      <Box sx={{ gridColumn: { sm: '1 / -1' }, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <Button type="submit" variant="contained" size="large" disabled={join.isPending}>
          {join.isPending ? 'Sending…' : 'Ask for my link'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          We use this only to set up and pay your link. See the{' '}
          <Link component={RouterLink} to="/privacy" underline="hover" color="inherit">
            Privacy Policy
          </Link>
          .
        </Typography>
      </Box>
    </Box>
  );
}

export function AffiliatesPage() {
  usePageMeta('Affiliates: earn 30%', 'For creators and coaches: a free account and 30% of every subscription from your link for 12 months.');
  return (
    <PublicLayout>
      <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 96, height: 'auto', mb: 2 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' }, mb: 1.5 }}>
          Share Dollars at Work, earn 30%
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
          For creators, coaches and planners whose audience plans their money one paycheck at a time. You get a free account and a share of
          every subscription you send our way.
        </Typography>
      </Box>

      <Section title="The offer">
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } }}>
          {offer.map((item) => (
            <Card key={item.title}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ color: 'primary.main', mb: 1 }}>{item.icon}</Box>
                <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Section>

      <Section title="How it works">
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2.5 }}>
          {steps.map((step, i) => (
            <Box key={step.title} component="li" sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" component="h3">
                  {step.title}
                </Typography>
                <Typography color="text.secondary">{step.body}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Section>

      <Section title="What your share looks like">
        <Card>
          <CardContent sx={{ p: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Example: annual plan
              </Typography>
              <Typography variant="h4" component="p" sx={{ my: 0.5 }}>
                $17.70
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per annual subscriber, from $59 a year.
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Example: monthly plan
              </Typography>
              <Typography variant="h4" component="p" sx={{ my: 0.5 }}>
                $2.10 a month
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per monthly subscriber, from $7 a month, for up to 12 months.
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          These are examples at today&apos;s prices. Your share is 30% of what each subscriber actually pays.
        </Typography>
      </Section>

      <Section title="What we ask">
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1 }}>
          {asks.map((ask) => (
            <Typography key={ask} component="li">
              {ask}
            </Typography>
          ))}
        </Box>
      </Section>

      <Section title="Questions">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2.5 }}>
          {questions.map((item) => (
            <Box key={item.q}>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                {item.q}
              </Typography>
              <Typography color="text.secondary">{item.a}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Something else? Email {SITE.contact} and a person will answer.
        </Typography>
      </Section>

      <Card component="section" id="ask" sx={{ outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>
            Ask for your link
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Tell us who you are and where you share. No forms to sign today.
          </Typography>
          <AskForLink />
        </CardContent>
      </Card>
    </PublicLayout>
  );
}
