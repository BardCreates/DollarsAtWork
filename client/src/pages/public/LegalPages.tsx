import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Link, Typography } from '@mui/material';
import { PublicLayout } from './PublicLayout';
import { SITE } from './siteInfo';
import { usePageMeta } from '../../lib/usePageMeta';

/**
 * These pages describe what the app actually does. They are written for the launch but have not been reviewed by a
 * lawyer (planned once there is revenue). If the behavior changes, change the page in the same commit.
 */
const DRAFT = SITE.draft;
const COMPANY = SITE.company;
const CONTACT = SITE.contact;
const UPDATED = 'October 16, 2026';

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PublicLayout maxWidth="sm">
      {DRAFT && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Draft. This page has not been reviewed by a lawyer and is not yet in effect.
        </Alert>
      )}
      <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {UPDATED}
      </Typography>
      <Box sx={{ '& h2': { mt: 4, mb: 1 }, '& p, & li': { color: 'text.secondary', lineHeight: 1.7 }, '& p': { mb: 1.5 }, '& ul': { pl: 3, mb: 1.5 } }}>{children}</Box>
    </PublicLayout>
  );
}

const H = ({ children }: { children: ReactNode }) => (
  <Typography variant="h6" component="h2">
    {children}
  </Typography>
);
const P = ({ children }: { children: ReactNode }) => <Typography component="p">{children}</Typography>;

export function TermsPage() {
  usePageMeta('Terms of Service');
  return (
    <LegalPage title="Terms of Service">
      <P>
        These terms are an agreement between you and {COMPANY} ("we", "us") for your use of Dollars at Work (the "service"). By creating an account you agree to
        them.
      </P>

      <H>What the service is</H>
      <P>
        Dollars at Work is a planning tool. You enter your income, budget categories, savings goals, debts, investment accounts and other assets, and it shows
        calculations and projections based on those numbers and on assumptions such as expected returns and inflation.
      </P>

      <H>Not financial advice</H>
      <P>
        The service gives estimates, not advice. We are not a financial adviser, broker, tax adviser or lawyer, and nothing in the service is a recommendation to
        buy, sell or hold any investment or to take on or pay off any debt. Projections are not predictions or guarantees; real results will differ. You are
        responsible for your own financial decisions.
      </P>

      <H>Your account</H>
      <ul>
        <li>You must give a real email address and keep your password to yourself.</li>
        <li>You are responsible for what happens under your account.</li>
        <li>You must be at least 18 years old to use the service.</li>
        <li>One free trial per person.</li>
      </ul>

      <H>Free trial and subscription</H>
      <ul>
        <li>New accounts get a 30-day free trial with full access. No payment card is needed for the trial.</li>
        <li>After the trial, a paid subscription (monthly or annual) is needed to keep editing. Without one, your account becomes read-only: you can still see and export your data.</li>
        <li>Subscriptions renew automatically at the end of each period until you cancel. Prices are shown on the <Link component={RouterLink} to="/pricing">pricing page</Link> and at checkout.</li>
        <li>You can cancel any time from your profile. You keep full access until the end of the period you have paid for.</li>
        <li>If you're not happy, email {CONTACT} within 30 days of your first payment and we'll refund it in full. After that, payments aren't refunded for unused time, except where the law requires.</li>
        <li>If a payment fails, you keep full access for 7 days while you update your card. After that the account becomes read-only.</li>
        <li>Payments are handled by Stripe. We never see or store your card number.</li>
        <li>We may change prices. We will tell you by email at least 30 days before a change applies to you.</li>
      </ul>

      <H>Your data</H>
      <P>
        The numbers you enter are yours. You can download them or delete your account, with everything in it, at any time from your profile. Our{' '}
        <Link component={RouterLink} to="/privacy">
          Privacy Policy
        </Link>{' '}
        explains what we keep and why.
      </P>

      <H>Acceptable use</H>
      <P>
        Don't break the law with the service, try to get into other people's accounts, interfere with how the service runs, or use automated tools to overload
        or copy it.
      </P>

      <H>Ending your account</H>
      <P>
        You can delete your account at any time. We may suspend or close an account that breaks these terms. If we close the service altogether, we will give
        you at least 30 days' notice so you can export your data.
      </P>

      <H>No warranty</H>
      <P>
        The service is provided "as is". We work to keep it accurate and available, but we do not promise that it will be free of errors or interruptions, or
        that its calculations are right for your situation.
      </P>

      <H>Limit of liability</H>
      <P>
        To the extent the law allows, we are not liable for indirect or consequential losses, or for financial decisions you make using the service, and our
        total liability to you is limited to the amount you paid us in the 12 months before the claim.
      </P>

      <H>Changes to these terms</H>
      <P>If we make a change that matters, we will tell you by email or in the app before it takes effect. Using the service after that means you accept the change.</P>

      <H>Governing law</H>
      <P>These terms are governed by the laws of the State of Arkansas, USA. If a dispute comes up, please contact us first; most things can be sorted out by email. Any dispute we can't resolve that way will be handled in the courts of Arkansas.</P>

      <H>Contact</H>
      <P>Questions about these terms: {CONTACT}.</P>
    </LegalPage>
  );
}

export function PrivacyPage() {
  usePageMeta('Privacy Policy', 'What Dollars at Work collects, why, who processes it and how to delete it.');
  return (
    <LegalPage title="Privacy Policy">
      <P>
        This policy explains what {COMPANY} ("we") collects when you use Dollars at Work, why, and what you can do about it. The short version: we keep what you
        type in so we can show it back to you, we don't connect to your bank, we don't sell your data, and we don't run advertising or tracking scripts.
      </P>

      <H>What we collect</H>
      <ul>
        <li><strong>Account details:</strong> your email address and a scrambled (hashed) version of your password. We cannot read your password.</li>
        <li><strong>What you enter:</strong> your income, budget categories, savings goals, debts, investment accounts, other assets and liabilities, one-time amounts you expect, the net-worth snapshots from your check-ins, and, if you set up a retirement number, your birth year, the age you'd like to retire and what you expect to spend and receive then. These are numbers and names you type; we never see bank logins, account numbers or transactions.</li>
        <li><strong>Where you signed up:</strong> the page whose "start your free trial" button you used, such as a blog post or a calculator, or the name of the affiliate whose link brought you here, so we can see which pages are useful and pay affiliates their share. If you arrive through an affiliate's link, your browser keeps that short tag (and nothing else) in the tab's session storage until the tab closes, so it isn't lost before you sign up.</li>
        <li><strong>Your settings:</strong> small preferences such as whether the app's first-time hints are on and which ones you've closed.</li>
        <li><strong>Affiliate link requests:</strong> if you ask for an affiliate link, we keep the email, name and place you share that you give us, and the date, so we can set up and pay your link. You don't need an account for this, and it isn't linked to one. If you left your email in our earlier "money note" box, we keep that address, the page you used and the date.</li>
        <li><strong>Subscription status:</strong> whether you are on trial, subscribed, past due or canceled, and identifiers that link your account to Stripe. Your card details go to Stripe and never reach us.</li>
        <li><strong>Technical records:</strong> standard server logs (such as IP address, time and the page requested), used for security and fixing problems. These are kept for no more than 30 days.</li>
        <li><strong>Usage counts:</strong> when someone opens the home, tools, demo, pricing or blog page, changes a number in a calculator, or first sees a projection, we record an anonymous event: its name, the time, and the referral tag in the address if there is one (such as the blog post that linked there). We also count sign-ups, trial starts and subscriptions the same way. These events hold no user id, no IP address, no cookie and no browser details, so they cannot be traced back to you, and no third party is involved. They are deleted after 13 months.</li>
      </ul>

      <H>How we use it</H>
      <ul>
        <li>To run the service: showing your plan, calculating projections, and keeping you signed in.</li>
        <li>
          To send account emails: confirming your address, password resets, billing notices, and a few during your trial: a welcome in your first
          hour that repeats the projection numbers from your own plan (or, if you haven't set one up yet, a reminder that it's waiting), one
          suggestion around day 3 to try a what-if scenario, and reminders a week and two days before the trial ends. We record when each of
          these went out so you never get one twice. The getting-started emails (the welcome or "your plan is waiting", and the day-3 suggestion) have an unsubscribe link; if you use it, we record
          that and send no more of them.
        </li>
        <li>To email the occasional money note (new articles and launch deals). Only addresses left in our earlier money note box get these.</li>
        <li>To take payment, through Stripe.</li>
        <li>To keep the service secure and to fix errors.</li>
      </ul>
      <P>We do not sell your data, share it for advertising, or use it to train AI models.</P>

      <H>Cookies</H>
      <P>
        We use one cookie, which keeps you signed in. It is essential for the service to work and is not used to track you. We do not use advertising or
        analytics cookies, and our usage counts (above) set no cookie. Stripe sets its own cookies on its checkout and billing pages.
      </P>

      <H>Who else handles your data</H>
      <ul>
        <li><strong>Stripe</strong> — payments and billing.</li>
        <li><strong>Resend</strong> — delivering account emails.</li>
        <li><strong>Microsoft Azure</strong> — running the app and storing the database, in the United States.</li>
        <li><strong>Sentry</strong> — telling us when something in the app breaks, so we can fix it. Error reports leave out what you typed into forms, your sign-in cookie and your IP address.</li>
      </ul>
      <P>They act on our instructions and may not use your data for their own purposes. We may also disclose data if the law requires it.</P>

      <H>How long we keep it</H>
      <P>
        We keep your data for as long as you have an account. When you delete your account, your account details and everything you entered are deleted from our
        database straight away, and your Stripe customer record is removed, which cancels any subscription. Two things outlast the account: Stripe keeps payment
        records as the law requires, and we keep a one-way fingerprint (hash) of your email address so the same address cannot start a second free trial. The
        fingerprint cannot be turned back into your email. Affiliate requests and money note addresses are kept until you ask us to remove yours. Database backups are overwritten within 7 days.
      </P>

      <H>Your choices</H>
      <ul>
        <li><strong>See and download:</strong> export everything from your profile, as spreadsheets or JSON.</li>
        <li><strong>Correct:</strong> change any number, or your email and password, in the app.</li>
        <li><strong>Delete:</strong> delete your account and all its data from your profile.</li>
        <li>Depending on where you live, you may have further rights, such as objecting to certain uses or complaining to a regulator. Contact us and we will help.</li>
      </ul>

      <H>Security</H>
      <P>
        Data is encrypted in transit. Passwords are hashed. The sign-in cookie cannot be read by scripts and is only sent to us. Sign-in locks for 15 minutes
        after five wrong passwords. No system is perfectly secure; if a breach affects you, we will tell you.
      </P>

      <H>Children</H>
      <P>The service is not meant for anyone under 18, and we do not knowingly collect their data.</P>

      <H>Changes</H>
      <P>If we change this policy in a way that matters, we will tell you by email or in the app before the change takes effect.</P>

      <H>Contact</H>
      <P>Questions or requests about your data: {CONTACT}.</P>
    </LegalPage>
  );
}
