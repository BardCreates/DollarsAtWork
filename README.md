# Dollars at Work

A monthly money plan that puts every dollar to work: split your income into categories, and the built-in
Savings, Debt and Investments categories drive their own modules and a long-range net-worth projection.

The full plan lives in the **DollarsAtWork Rebuild Plan** doc. This repo is the from-scratch rebuild; the old
`budget-web` / `budget-api` projects are reference only.

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

## Folder layout

```
server/DollarsAtWork.Api   .NET 10 API (Identity cookie sign-in, EF Core, SQL Server)
  Domain/                  Entities: AppUser, Plan, Category, Subscription
  Data/                    AppDbContext
  Common/                  Account setup, email, current-user helper
  Features/Auth/           Sign-up / sign-in endpoints
  Features/Plan/           Income and category endpoints
  Features/Debts/, Savings/, Investments/, NetWorth/, Billing/, Account/
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
