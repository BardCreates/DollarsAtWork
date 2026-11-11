# Dollars at Work

A monthly money plan that puts every dollar to work: split your income into categories, and the built-in
Savings, Debt and Investments categories drive their own modules and a long-range net-worth projection.

**Live:** [dollarsatwork.app](https://dollarsatwork.app) · try it without an account: [sample plan](https://dollarsatwork.app/demo) · [calculators](https://dollarsatwork.app/tools)

**Walkthrough** (1:44, narrated, sample data):

https://github.com/user-attachments/assets/73cd8724-1367-4035-b304-dc1465e1a11e

> **About this repository.** Dollars at Work is designed, built, deployed and maintained by
> [Hannah Nicholls](https://www.linkedin.com/in/hannah-nicholls-6126b3150) using agentic AI-assisted development
> (Claude Code; `CLAUDE.md` holds the rules and conventions the agent works under, and `docs/PLAN.md` the product spec).
> The source is published so it can be reviewed; it is **not open source**. See [LICENSE](LICENSE).

**Stack:** ASP.NET Core (.NET 10) Minimal APIs · EF Core + SQL Server / Azure SQL · ASP.NET Identity (cookie auth) ·
React 19 + TypeScript + Vite · Material UI · TanStack Query · React Hook Form + Zod · Recharts · Stripe · Resend ·
Sentry · Azure App Service, deployed by GitHub Actions on every push to `main`.

**Engineering highlights**

- **A pure TypeScript projection engine** (`client/src/lib/projection`) simulates every debt, savings goal and
  investment account month by month for up to 40 years: snowball/avalanche payoff (including promotional APRs),
  goal rollovers, sinking funds, employer match capped by salary, windfalls, raises and inflation. Every rule has a
  Vitest test whose expected numbers are worked out by hand, never pasted from the engine's output.
- **279 unit tests** across the engine, calculators, blog/help content and UI logic (`npm test` in `client/`).
- **Security by default:** the user id comes only from an HttpOnly, SameSite=Strict auth cookie; every query is
  scoped to it; per-IP rate limiting; account lockout; security headers; email addresses masked in logs; no tokens or
  user data in browser storage.
- **Billing that can't drift:** subscription status changes only by copying Stripe's state, from signature-verified
  webhooks (with duplicate protection) or a server-side sync; a background worker re-checks lapsing subscriptions so a
  missed webhook can't lock out a paying user.
- **Production hygiene:** money is `decimal` and rounded to cents on write; EF Core migrations with retry-on-failure for
  Azure SQL; the API refuses to start in production if a required setting is missing; data export (JSON/CSV) and
  account deletion; scheduled retention cleanup.
- **Public pages pre-rendered at build time** for search (per-page meta, Open Graph, JSON-LD, generated sitemap), then
  hydrated by the live app.

The sections below are the build log, phase by phase.

## What's in Phase 1

- Sign up, sign in, sign out, forgot/reset password, confirm email (emails print to the API console for now)
- Every new account gets a plan, the three built-in categories and a 30-day free trial (no card)
- The app shell in the original look: dark theme, mascot, top navigation, trial banner

## What's in Phase 2

- Plan page: monthly income, Allocated and Remaining (red with "Over-allocated by" when you plan more than you earn)
- Categories: add, rename, recolor, drag to reorder, delete with undo; amounts typed in dollars or as a percent of income
- Savings, Debt and Investments are locked: they can be reordered and re-amounted, not renamed or deleted
- "Scale all to new income" after an income change, and a donut of where the money goes
- Every change saves by itself; expired accounts can look but not edit

## What's in Phase 3

- The projection engine (`client/src/lib/projection`): one month-by-month simulation of savings goals, debt payoff
  and investment growth, with money rolling forward when a debt is paid off or a goal is full
- Options for today's dollars (inflation) and a yearly income raise
- 35 tests with hand-checked numbers: `npm test` in `client/`
- No screens use it yet; the Debt, Savings and Invest modules and the dashboard are next

## What's in Phase 4

- Debt page: add, edit and delete debts (name, type, balance, APR, minimum payment)
- Snowball, avalanche or your own drag order for where extra money goes
- Debt-free date, interest you'll pay, and what you save compared with paying minimums only
- Balance-over-time chart and a month-by-month payment schedule
- A warning when the plan's Debt amount doesn't cover the minimum payments

## What's in Phase 5

- Savings page: goals with a target, a balance, and an optional target date and APY
- Fill goals in priority order (drag to reorder) or split by percent; a finished goal passes its money on
- Progress bars, the month each goal is reached, and "on track" or "needs about $X/month more" for dated goals
- An emergency fund starter sized at 3 or 6 months of the plan's expenses
- A timeline chart of every goal's balance

## What's in Phase 6

- Invest page: accounts with a type, balance, expected yearly return and optional employer match
- A split editor for how the monthly amount is shared; the shares must total 100%
- What it could be worth in 5, 10, 20 and 30 years, split into what you put in, employer match and growth
- A contributions-vs-growth chart

## What's in Phase 7

- Dashboard: net worth today, a 0–40 year slider, and what the plan projects at that year
- Projection chart, milestones (debt-free, each goal, $100k, $1M), this month's plan, debt payoff, savings goals
- Other assets and debts (home, car…), assets vs liabilities, and a net-worth history built from monthly check-ins
- Assumptions: today's dollars, inflation, yearly raise, and where money goes once debt is paid or goals are full

## What's in Phase 8

- Subscribe monthly or annually through Stripe Checkout; manage or cancel in Stripe's customer portal
- Status kept in step with Stripe by signed webhooks, and refreshed whenever you come back from Stripe
- Past due keeps full access for 7 days; canceled keeps it until the period ends; expired is read-only
- Trial emails at 7 days left, 2 days left and when the trial ends (printed to the API console for now)

## What's in Phase 9

- Tools page with four calculators: compound interest, early loan payoff, loan comparison and DRIP (dividend reinvestment)
- They use the same maths as the rest of the app, and nothing typed into them is saved

## What's in Phase 10 so far

- Profile: change your email (confirmed by a link sent to the new address) or password, download all your data
  as spreadsheets or JSON, or delete your account and everything in it (which also cancels any subscription)
- A three-step setup walkthrough for new accounts
- A public pricing page, plus draft Terms and Privacy pages (not yet reviewed by a lawyer)
- One free trial per email address, even after an account is deleted
- Every page checked at phone width

## Move a dollar (stand-out step 1)

- On the Plan page, a panel shows your debt-free date and net worth in 10 years, and how far each moves as you
  type a new amount, before anything is saved
- Every spending category shows what that monthly amount could grow to in 10 years if invested instead
- On phones the panel stays pinned at the top while you edit

## Rollover messages (stand-out step 2)

- The Debt page lists, in order, when each debt is paid off and where its monthly payment goes next
  (another debt, or your investments, savings or Remaining once all debt is gone)
- The Savings page does the same for goals: the next goal down the list in priority mode, or every goal still open in percent mode
- Where finished money goes at the end is the setting under Assumptions on the Dashboard

## Money timeline (stand-out step 3)

- The Dashboard's milestones are now a dated roadmap: each debt paid off, debt-free, each savings goal, and the
  next few net-worth steps ($10k, $25k, $50k, $100k and so on), with how far away each is
- Milestones within three months are marked "Almost there"; when one is within a month the mascot sets off confetti
  (once per visit, and not at all if your device asks for reduced motion). Tap the mascot to celebrate any time
- Milestones already reached are listed in one line at the bottom

## What-if scenarios (stand-out step 4)

- A "What if" page: save up to three versions of your plan (cut a category, a raise, a different payoff order, where
  money goes once debt is gone) and compare them with your real plan on one chart
- Side by side: debt-free date, net worth in 10, 20 and 30 years, and the interest you'd pay, each shown against the real plan
- A what-if never changes your real plan, and anything it doesn't change keeps following your plan as it changes
- Included in your data export. Because the nav gained an item, the top menu now collapses to the hamburger below 1200px

## Monthly report card (stand-out step 5)

- Saving a monthly check-in now opens a one-screen recap: your net worth and how it moved since the last check-in,
  how savings, investments and debt each moved, where your plan is headed (debt-free date, net worth in 10 years)
  and what's next on your timeline
- "Email me a copy" sends the recap to your own address (in development it prints in the API terminal)
- "See your recap" on the Dashboard's check-in card reopens the latest one
- Check-ins now keep totals for savings, investments and debt, so the recap can show the change in each; they're in
  your data export too

## Public calculators and demo (stand-out step 6)

- The Tools calculators now open without an account at /tools, with a new "cost of a habit" calculator.
  Link straight to one with /tools?tool=habit (also compound, payoff, compare, drip)
- Under each calculator, visitors who aren't signed in are invited to start the free trial
- /demo is a sample plan anyone can try: a made-up person, the real projection engine, and a slider for
  "what if more went toward debt each month?"
- The setup walkthrough keeps your own net worth in 10 years in view and updates it as you enter things
- Pricing and the footer link to the calculators and the sample plan

## Launch polish (stand-out step 7, so far)

- Installable: a web app manifest, icons, and a small service worker that shows a friendly page when you're offline.
  It never caches or answers API calls and never stores anything you've entered. Browsers that offer installation
  get an "Install the app" button on Profile. The worker only registers in a production build
- A public Security page, "Private by design": what we never ask for (no bank login), what we keep, how the
  account is protected, and your data being yours
- The owner's company name and contact email for public pages are set in one place, client/src/pages/public/siteInfo.ts

## Folder layout

```
server/DollarsAtWork.Api   .NET 10 API (Identity cookie sign-in, EF Core, SQL Server)
  Domain/                  Entities: AppUser, Plan, Category, Subscription
  Data/                    AppDbContext
  Common/                  Account setup, email, current-user helper
  Features/Auth/           Sign-up / sign-in endpoints
  Features/Plan/           Income and category endpoints
  Features/Debts/, Savings/, Investments/, NetWorth/, Billing/, Account/, Scenarios/
client/                    React 19 + TypeScript + Vite + Material UI
  src/theme.ts             The Dollars at Work look (colors, fonts, cards)
  src/api/                 One fetch wrapper for the API
  src/auth/                Signed-in user, sign-in hooks, route guards
  src/layout/              Top bar, trial banner, page frame
  src/features/plan/       The Plan page
  src/lib/money.ts         Money formatting and amount parsing
  src/lib/projection/      The projection engine and its tests
  src/pages/               Screens
```

## First-time setup (Windows)

You need: **.NET 10 SDK**, **Node.js 20 or newer**, and **SQL Server LocalDB** (comes with Visual Studio).

Open a terminal in `C:\Toolbox\DollarsAtWork2`:

```powershell
# 1. Tools and packages
dotnet tool restore
dotnet restore server/DollarsAtWork.Api
cd client
npm install
cd ..

# 2. Trust the local HTTPS certificate (once per machine)
dotnet dev-certs https --trust

# 3. Billing (optional): store your Stripe TEST secret key outside the code
dotnet user-secrets set "Stripe:SecretKey" "sk_test_..." --project server/DollarsAtWork.Api
```

The database is created, and every migration applied, automatically when the API starts in Development.
Without a Stripe key the app still runs; the Profile page just says subscribing isn't available.

To receive Stripe webhooks locally, install the Stripe CLI, run
`stripe listen --forward-to https://localhost:7180/api/billing/webhook --skip-verify`, and store the signing
secret it prints with `dotnet user-secrets set "Stripe:WebhookSecret" "whsec_..." --project server/DollarsAtWork.Api`.

## Running it

Two terminals:

```powershell
# Terminal 1: API on https://localhost:7180
dotnet run --project server/DollarsAtWork.Api --launch-profile https

# Terminal 2: web app on http://localhost:5173
cd client
npm run dev
```

Open **http://localhost:5173**. The web app forwards `/api` calls to the API, so the sign-in cookie works
with no extra setup.

Password-reset and confirmation emails are written to the **API terminal**. Copy the link from there.

## Changing the database

After changing an entity or `AppDbContext`:

```powershell
dotnet ef migrations add <ShortName> --project server/DollarsAtWork.Api --output-dir Data/Migrations
```

The API applies new migrations when it starts in Development.

## Production build

```powershell
cd client
npm run build        # writes the web app into server/DollarsAtWork.Api/wwwroot
cd ..
dotnet publish server/DollarsAtWork.Api -c Release
```

One server then hosts both the API and the web app at the same address. Set these on the host:

| Setting | Example |
| --- | --- |
| `ConnectionStrings__Default` | Azure SQL connection string |
| `App__PublicUrl` | `https://app.dollarsatwork.com` (used in email links) |
| `Stripe__SecretKey`, `Stripe__WebhookSecret` | From the Stripe dashboard (live mode in production) |
| `Stripe__MonthlyPriceId`, `Stripe__AnnualPriceId` | The two price ids |

## Security rules this codebase follows

- The signed-in user comes only from the auth cookie. No endpoint accepts a user id.
- The cookie is HTTP-only, Secure and SameSite=Strict; nothing sensitive goes in browser storage.
- Sign-in locks for 15 minutes after 5 wrong passwords; auth endpoints are rate-limited per IP.
- Secrets live in configuration (user secrets in dev, app settings in production), never in code.
- Card details are entered on Stripe's pages and never reach this app. Webhooks are accepted only with a valid signature.
