# CLAUDE.md — Dollars at Work

A subscription web app for monthly money planning. The user enters monthly income and splits it into
categories. Three built-in categories (Savings, Debt, Investments) drive their own modules, and the
dashboard projects net worth over 0–40 years from the plan.

**Read `docs/PLAN.md` before starting any phase.** It is the product spec: rules, data model, build phases
and decisions already made. Don't re-ask decided questions.

## Current status

- Phase 1 (Foundation) is built and verified locally: API and client build clean, `InitialCreate`
  migration applied, auth flow tested end to end against the API.
- Phase 2 (Planning) is built and verified: income, categories (add/rename/delete with undo/drag), Remaining,
  donut, read-only for expired accounts. Not built yet: the dashboard's over-allocated warning (Phase 7).
- Phase 3 (Projection engine) is built: `client/src/lib/projection/`, 35 Vitest tests with hand-checked numbers.
  Nothing calls it yet; the Debt, Savings and Invest modules and the dashboard will.
- Phase 4 (Debt module) is built and verified: debts, strategy, payoff figures, chart, schedule.
- Phase 5 (Savings module) is built and verified: goals, priority/percent split, on-track check, emergency fund starter, timeline.
- Phase 6 (Investments module) is built and verified: accounts, employer match, split that must total 100%, growth chart.
- Phase 7 (Dashboard) is built and verified: net worth + slider, projection chart, milestones, cards, other items,
  assumptions, monthly check-in.
- Phase 8 (Trial and billing) is built and verified in Stripe test mode: Checkout, customer portal, sync on return,
  signed webhooks with duplicate protection, trial emails (day 23, day 28, ended), billing card on Profile.
  Still open: a real email provider, a registered webhook endpoint (production), delete account / export data.
- Phase 9 (Tools) is built and verified: compound interest, early payoff, loan comparison and DRIP calculators.
- Phase 10 (Launch), the parts that needed no owner input, are built and verified: change password, change email
  (confirmed by a link to the new address), export data (JSON or a zip of CSVs), delete account (cancels Stripe),
  one trial per email, first-run walkthrough (/welcome), pricing page, draft terms and privacy pages, 360px pass.
- Still open for launch, all waiting on the owner: hosting + domain, a real email provider, error tracking,
  legal review of `client/src/pages/public/LegalPages.tsx` (fill the [bracketed] placeholders, set DRAFT to false),
  final prices, Managed Payments on or off, registering the production webhook endpoint.

- Stand-out step 1 (Move a dollar) is built and verified: live impact panel on the Plan page (debt-free date and
  10-year net worth vs the plan you started the visit with, updating as you type) and "if invested" cost of a habit
  on every custom category.
- Stand-out step 2 (Rollover messages) is built and verified: the Debt and Savings pages say, in plain sentences,
  where each paid-off debt's or full goal's money goes next and when ("When Visa is paid off in Nov 2027, its $370
  a month moves to Car loan."). Read from the projection itself, so it can't disagree with the numbers.
- Stand-out step 3 (Money timeline) is built and verified: the dashboard's milestones are now a dated roadmap
  (each debt payoff, debt-free, each goal, the next three net-worth steps), and the mascot cheers with confetti when
  one is within a month (once per visit, never with reduced motion) or when tapped.
- Next: stand-out step 4 (What-if scenarios; new Scenarios table), then 5–7 in PLAN.md "Build status and next work",
  one step at a time.

## What we compete on

The edge is connecting this month's plan to future net worth: the live "move a dollar" panel, what-if
scenarios, the money timeline and the monthly report card (PLAN.md "What makes it stand out").
When a design choice comes up, favor whatever makes that connection clearer and faster.
Not in version 1: bank linking (no Plaid) and transaction tracking. Don't add them.
The pitch is "private by design: no bank login".

## Commands (Windows / PowerShell, run from repo root)

```powershell
dotnet tool restore                                   # installs dotnet-ef from .config/dotnet-tools.json
dotnet build server/DollarsAtWork.Api
dotnet run --project server/DollarsAtWork.Api --launch-profile https   # API on https://localhost:7180
dotnet ef migrations add <Name> --project server/DollarsAtWork.Api --output-dir Data/Migrations

cd client
npm install
npm run dev          # http://localhost:5173, proxies /api to the API
npm run typecheck
npm test             # Vitest, runs once
npm run build        # outputs into server/DollarsAtWork.Api/wwwroot

# A second copy for testing, without touching the dev database or ports:
#   API:    ConnectionStrings__Default=<other db>  dotnet <Release dll> --urls https://localhost:7190
#   client: DAW_PORT=5174 DAW_API_URL=https://localhost:7190 npx vite
```

Dev emails (confirm, reset, trial reminders) are logged to the API console, not sent.
Stripe (test mode): the secret key lives in user secrets, never in the repo:
`dotnet user-secrets set "Stripe:SecretKey" "sk_test_..." --project server/DollarsAtWork.Api` (and `Stripe:WebhookSecret`
when using `stripe listen`). Price ids are in `appsettings.Development.json`. Without a key, billing reports "not set up".
The API applies migrations automatically on startup in Development.

## Layout

```
server/DollarsAtWork.Api/
  Program.cs              DI, Identity cookie auth, rate limiting, endpoint mapping
  Domain/Entities.cs      AppUser, Plan, Category (+CategoryKind), Subscription (+status logic)
  Data/AppDbContext.cs    single EF Core context; Data/Migrations/
  Common/                 AccountSetup (new-account defaults), Email, CurrentUser, FullAccess (.RequireFullAccess()),
                          Validation (field checks -> ValidationProblem; use it in every new endpoint),
                          TrialEmails (TrialEmailService + hourly TrialEmailWorker)
  Features/<Feature>/     <Feature>Endpoints.cs + <Feature>Contracts.cs (request/response records)
client/src/
  theme.ts                the brand: colors, fonts, card style, chartPalette
  api/client.ts           the ONLY fetch wrapper (api.get/post/put/patch/delete, ApiError, errorMessage)
  auth/                   useMe + auth mutations, route guards, passwordRule
  layout/                 TopBar, TrialBanner, AppShell
  components/             shared UI (PageHeader, Figure, PlanAmountBanner, RolloverList, Wordmark, MoneyField, formHelpers.muiField)
  lib/money.ts            the ONLY money formatter/parser (formatMoney, formatPercent, parseMoneyInput)
  lib/calculators.ts      the maths for the Tools page (reuses the projection engine); hand-checked tests beside it
  lib/timeline.ts         buildTimeline: the dated roadmap read from a projection; isNear / isDone / nextUp
  lib/rollover.ts         debtRollovers / goalRollovers: who receives a finished debt's or goal's money, read from a projection
  lib/planImpact.ts       comparePlans (two projections -> months sooner, net worth change), habitCost, planExpectedReturn
  lib/dates.ts            months-from-now as text (formatMonthFromNow, formatDuration)
  lib/projection/         the projection engine: project(input) -> month-by-month result; rates are percents (7 = 7%)
  features/account/       account.ts + AccountCards (change email/password, export, delete) shown on the Profile page
  features/setup/         WelcomePage: the first-run walkthrough at /welcome
  features/dashboard/     (also) TimelineCard: the roadmap and the mascot celebration
  features/billing/       billing.ts (prices, checkout, portal, sync) + BillingCard shown on the Profile page
  features/dashboard/     Dashboard: networth.ts, useDashboard.ts (all data -> one projection), cards, dialogs, check-in
  features/debt/          Debt page: debts.ts (query, mutations, useDebtProjection), list, dialog, chart, schedule
  features/tools/         Tools page: ToolsPage (tabs), calculators.tsx (the four calculators), NumberField
  features/savings/       Savings page: savings.ts (query, mutations, useSavingsProjection), goal list, dialog, timeline
  features/invest/        Invest page: investments.ts (query, mutations, useInvestmentProjection), account and split dialogs, chart
  features/plan/          Plan page: plan.ts (query + mutations), PlanPage, CategoryRow, AddCategoryForm, AllocationDonut,
                          ImpactPanel + usePlanImpact (Move a dollar). MoneyField.onDraft reports amounts while typing;
                          PlanPage lays those drafts over the saved plan as `livePlan` for everything on screen.
  pages/                  auth screens, Profile, NotFound, public/ (pricing, terms, privacy, PublicLayout + FooterLinks);
                          everything else lives in client/src/features/<feature>/
docs/PLAN.md              product spec
```

## Rules that must not be broken

**Security**
- The user id comes only from the auth cookie: `ClaimsPrincipal.GetUserId()`. Never accept a user id in
  a route, query or body. Every query on user data filters by that id.
- Every user-data endpoint calls `.RequireAuthorization()`. Writes also require full access
  (`Subscription.HasFullAccess(now)`); expired users are read-only, not locked out.
- No secrets in code or committed config. Use `dotnet user-secrets` in dev.
- Subscription status changes only by copying Stripe's state (`BillingService.Apply`), from a verified webhook or a
  sync that asks Stripe. Never set it from anything the browser sends. Billing endpoints stay open to expired accounts.
- No tokens or user data in localStorage/sessionStorage. The cookie is HttpOnly + SameSite=Strict.

**Money and data**
- Money is `decimal` in C# (stored `decimal(19,4)` by convention) and dollars as `number` in TS.
  Round only for display, using one shared formatter.
- Built-in categories are found by `CategoryKind`, never by name. They can't be deleted or renamed;
  enforce this on the server, not just in the UI.
- Modules read their monthly amount from the built-in category. Never store a second copy.
- Schema changes go through EF migrations. Never edit an applied migration.
- Enums are stored as strings.

**Projection engine**
- One pure TypeScript module in `client/src/lib/projection/`, no I/O, used by every module and the dashboard.
- Every rule in PLAN.md "Projection engine" gets a Vitest test with hand-checked numbers. Work the expected
  numbers out by hand in a comment; never paste them from the engine's output.

## Conventions

**API**
- Minimal APIs, one static `Map<Feature>Endpoints(this RouteGroupBuilder api)` per feature, mapped in `Program.cs`.
- Request/response types are `record`s in `<Feature>Contracts.cs`. Never return EF entities directly.
- Errors: `Results.ValidationProblem(dict)` for field errors (keys are camelCase field names),
  `Results.Problem(...)` otherwise. The client reads these through `ApiError`.
- Use `TimeProvider` for "now" (injected), so dates are testable.

**Client**
- Material UI only for components and styling; colors come from `theme.ts`, never hard-coded hex in components.
- Server data via TanStack Query: one `use<Thing>()` query hook + mutation hooks per feature, with query
  keys defined next to them. No global store.
- Forms: React Hook Form + Zod; use `muiField(register, 'name')` for TextFields, `Controller` for others.
- Charts: Recharts, colors from `chartPalette`.
- Keep the established look: dark cards with gradient, green primary, page = `PageHeader` + cards + tabs.
- Mobile works at 360px wide. A `display: grid` list needs `gridTemplateColumns: 'minmax(0, 1fr)'`, or one long
  name widens every row past its card.

**Copy**
- Plain, friendly sentences. Sentence-case buttons. Money shown as `$1,234` (cents only where it matters).

## How to work in this repo

- Start a phase by restating its scope from PLAN.md and listing the files you'll add or change. Then build it.
- After changes: `dotnet build` and `npm run typecheck`, and run tests once they exist. Fix everything before
  calling a phase done.
- End each phase with: what was built, how to try it in the browser, and anything deferred.
- Commit in small, clear steps with messages that say what changed for the user.
- Don't modify the old reference projects (`budget-web`, `budget-api`, `C:\Toolbox\DollarsAtWork`).
- Ask before adding a new dependency that isn't in the PLAN.md tech stack.
