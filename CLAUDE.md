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
- Email provider is wired: `ResendEmailSender` (Common/Email.cs) is used when `Email:ResendApiKey` is set, otherwise
  emails still print to the console. Production refuses to start if any required setting is missing (Program.cs).
- Deploy: `.github/workflows/deploy.yml` builds the client into wwwroot, publishes the API and deploys to one Azure
  App Service on every push to `main`. Needs the two GitHub secrets named at the top of that file.
- Fonts are self-hosted via `@fontsource/inter` and `@fontsource/coiny` (main.tsx); the Google Fonts links and the
  Security page's "One honest note" are gone.
- Still open for launch, all waiting on the owner: Azure resources + domain, a Resend account (verify the domain,
  set `Email__ResendApiKey` and `Email__From` on the host), error tracking (Sentry: `dotnet add package Sentry.AspNetCore`,
  `builder.WebHost.UseSentry()`, DSN in `Sentry__Dsn`), legal review of `LegalPages.tsx` (filled in Oct 15:
  Dollars at Work, dollarsatworkapp@gmail.com, Arkansas law, 30-day first-payment refund; not lawyer-reviewed), live Stripe prices ($7 monthly, $59 annual, $49 founding x200),
  registering the production webhook endpoint.

- Stand-out step 1 (Move a dollar) is built and verified: live impact panel on the Plan page (debt-free date and
  10-year net worth vs the plan you started the visit with, updating as you type) and "if invested" cost of a habit
  on every custom category.
- Stand-out step 2 (Rollover messages) is built and verified: the Debt and Savings pages say, in plain sentences,
  where each paid-off debt's or full goal's money goes next and when ("When Visa is paid off in Nov 2027, its $370
  a month moves to Car loan."). Read from the projection itself, so it can't disagree with the numbers.
- Stand-out step 3 (Money timeline) is built and verified: the dashboard's milestones are now a dated roadmap
  (each debt payoff, debt-free, each goal, the next three net-worth steps), and the mascot cheers with confetti when
  one is within a month (once per visit, never with reduced motion) or when tapped.
- Stand-out step 4 (What-if scenarios) is built and verified: up to 3 saved versions of the plan (new Scenarios table),
  compared with the real plan on one chart and a side-by-side table (debt-free date, net worth at 10/20/30 years,
  interest paid). A scenario stores only its changes (income, category amounts, raise, payoff order, where finished
  money goes), so anything it doesn't change keeps following the real plan. It never changes the real plan.
- Stand-out step 5 (Monthly report card) is built and verified: saving a check-in opens a one-screen recap (net worth and
  its change since the last check-in, savings/investments/debt each, where the plan is headed, next milestone) with an
  "Email me a copy" button that sends it to the user's own address. Snapshots now also record savings, investments and
  debt totals (nullable: older snapshots predate them).
- Stand-out step 6 (Public calculators and demo) is built and verified: /tools and /demo are open to signed-out visitors
  (VisitorShell: app frame when signed in, public frame when not); a cost-of-a-habit calculator joins the Tools; each
  calculator and the demo end with a trial call to action for visitors; /demo runs the real projection engine on a
  made-up person (lib/sampleData.ts) with a "move a dollar" slider; /welcome shows the user's own live 10-year number.
- Stand-out step 7 (Launch polish), the mechanical parts, are built: an installable app (manifest, icons, a minimal
  service worker that only serves an offline page and never touches the API or stores anyone's numbers, and an
  "Install the app" button on Profile when the browser offers it) and a public /security page ("Private by design").
  Still to do, waiting on the owner: the voice pass (a proposal of before/after wording was sent for approval),
  and the Google Fonts question (see below).
- Open: fonts load from Google Fonts (index.html), which sends each visitor's address to Google. For a "no tracking"
  pitch, self-host Inter and Coiny (both OFL) instead, then delete the "One honest note" section of SecurityPage.
- The voice pass is applied (see "Voice" under Copy). Next: the launch items above.
- Home page, waitlist, hints and help (Oct 15) are built: signed-out visitors at `/` get the home page (features/home;
  `HomeRoute` shows the dashboard inside `AppShell` once signed in); a waitlist box (features/waitlist, POST /api/waitlist,
  WaitlistEntries table, rate-limited per IP) on the home page and under every calculator and the demo; a first-time hint
  at the top of each app page plus a tour on the dashboard (features/hints; closed hint ids and an all-off switch are stored
  on AppUser and sent with /auth/me; Profile has a Show hints switch); a searchable help guide at /help (features/help:
  articles.ts holds every article in a small markup, helpSearch.ts ranks results; both tested). Help articles describe the
  app as it is: when a screen changes, change its article in the same commit.
- Blog (Oct 15) is built into the app at /blog and /blog/:slug (features/blog), open to everyone. Posts are Markdown
  files in client/src/content/blog named YYYY-MM-DD-slug.md with a --- block (title, date, summary, tags, draft).
  draft: true keeps a post off the live site (it shows locally, marked Draft); publish by setting draft: false and
  merging. markdown.ts is a small reader (headings, lists, tables, bold/italic/links); tests check every post file.
  Later: move the blog to a separate static site at blog.dollarsatwork.app (launch plan) for better search ranking.
- Blog as a sales tool (Oct 15): each post names a call to action with cta: (debt, payoff, savings, invest, budget,
  habit; see features/blog/ctas.ts). Visitors get a compact ask before the heading nearest the middle of the post
  (PostCtaCard) and the full TrialCta at the end; signed-in readers get a link to the matching app page instead.
  Every sign-up link carries ?from=<page> (lib/signUp.ts: signUpPath); the sign-up page sends it and the server keeps
  it on AppUser.SignupSource (cleaned by Common/SignupSources). Which pages bring trials:
  SELECT SignupSource, COUNT(*) FROM AspNetUsers GROUP BY SignupSource ORDER BY COUNT(*) DESC;
- Founding price (Oct 15): Stripe:FoundingPriceId (optional; empty = no offer) and Stripe:FoundingLimit (200). Spots taken
  are counted from Stripe (subscriptions on that price past "incomplete"), cached a minute, so the cap is soft. /billing/prices
  returns founding {price, taken, limit, open}; checkout takes plan monthly|annual|founding and refuses founding once full.
  Checkout allows Stripe promotion codes and only asks for a card when something is owed (a 100% code needs none).

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
                          (Scenarios keeps its changes as one JSON column: ScenarioOverrides, read via ScenarioJson)
client/src/
  theme.ts                the brand: colors, fonts, card style, chartPalette
  api/client.ts           the ONLY fetch wrapper (api.get/post/put/patch/delete, ApiError, errorMessage)
  auth/                   useMe + auth mutations, route guards, passwordRule
  layout/                 TopBar, TrialBanner, AppShell
  components/             shared UI (PageHeader, Figure, PlanAmountBanner, RolloverList, Wordmark, MoneyField, formHelpers.muiField)
  lib/money.ts            the ONLY money formatter/parser (formatMoney, formatPercent, parseMoneyInput)
  lib/calculators.ts      the maths for the Tools page (reuses the projection engine); hand-checked tests beside it
  lib/installPrompt.ts    catches the browser's install offer at start-up; useInstallPrompt() for the Profile button
  lib/sampleData.ts       the made-up "Alex" plan behind the public /demo page (sampleInput(extraToDebt))
  lib/report.ts           buildReport: latest check-in vs the one before, per area (savings / investments / debt)
  lib/scenarios.ts        resolveScenario / changesBetween (a scenario is the plan + its changes), summarizeProjection
  lib/timeline.ts         buildTimeline: the dated roadmap read from a projection; isNear / isDone / nextUp
  lib/rollover.ts         debtRollovers / goalRollovers: who receives a finished debt's or goal's money, read from a projection
  lib/planImpact.ts       comparePlans (two projections -> months sooner, net worth change), habitCost, planExpectedReturn
  lib/dates.ts            months-from-now as text (formatMonthFromNow, formatDuration)
  lib/projection/         the projection engine: project(input) -> month-by-month result; rates are percents (7 = 7%)
  public/sw.js            the service worker: offline page only; tested in lib/serviceWorker.test.ts. Never cache /api.
  features/demo/          DemoPage: the sample plan anyone can play with, no account (SampleImpactCard: its slider, also on the home page)
  features/home/          HomePage (visitors at /) and HomeRoute (home page or dashboard)
  features/waitlist/      WaitlistForm + useJoinWaitlist; the box shown to visitors on home, tools and demo
  features/hints/         Hint card, per-page hint text (PageHints), useShowHint/useDismissHint/useSetHintsOff, Profile HintsCard
  features/help/          the help guide: articles.ts, helpSearch.ts, helpMarkup.ts, HelpPage (/help), HelpArticlePage (/help/:slug)
  features/blog/          the blog: posts.ts (reads content/blog/*.md), markdown.ts, MarkdownContent, BlogPage, BlogPostPage
  content/blog/           one Markdown file per post (see posts.ts for the format)
  layout/VisitorShell.tsx the frame for pages open to everyone (/tools, /demo): AppShell when signed in, public frame when not
  features/account/       account.ts + AccountCards (change email/password, export, delete) shown on the Profile page
  features/setup/         WelcomePage: the first-run walkthrough at /welcome
  features/dashboard/     (also) TimelineCard: the roadmap and the mascot celebration; ReportDialog: the check-in recap
  features/scenarios/     What if page: scenarios.ts (query, mutations, useComparison), ScenarioDialog, CompareView
  features/billing/       billing.ts (prices, checkout, portal, sync) + BillingCard shown on the Profile page
  features/dashboard/     Dashboard: networth.ts, useDashboard.ts (all data -> one projection), cards, dialogs, check-in
  features/debt/          Debt page: debts.ts (query, mutations, useDebtProjection), list, dialog, chart, schedule
  features/tools/         Tools page: ToolsPage (tabs), calculators.tsx (the four calculators), NumberField
  features/savings/       Savings page: savings.ts (query, mutations, useSavingsProjection), goal list, dialog, timeline
  features/invest/        Invest page: investments.ts (query, mutations, useInvestmentProjection), account and split dialogs, chart
  features/plan/          Plan page: plan.ts (query + mutations), PlanPage, CategoryRow, AddCategoryForm, AllocationDonut,
                          ImpactPanel + usePlanImpact (Move a dollar). MoneyField.onDraft reports amounts while typing;
                          PlanPage lays those drafts over the saved plan as `livePlan` for everything on screen.
  pages/                  auth screens, Profile, NotFound, public/ (pricing, terms, privacy, security, PublicLayout + FooterLinks,
                          siteInfo.ts = the owner's company name / contact email still to fill in);
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
- Voice (the mascot's): talk to one person, as "you"; short sentences, no jargon, and say what happened and what to do
  next; warm and a little playful, never about money mistakes; at most one exclamation mark on a screen and none
  on errors; never promise an outcome (estimates are estimates) and never promise something the app doesn't do.
- Every claim on the public Security and Privacy pages must describe something the code does today. If you change
  the behavior, change the page in the same commit.

## How to work in this repo

- Start a phase by restating its scope from PLAN.md and listing the files you'll add or change. Then build it.
- After changes: `dotnet build` and `npm run typecheck`, and run tests once they exist. Fix everything before
  calling a phase done.
- End each phase with: what was built, how to try it in the browser, and anything deferred.
- Commit in small, clear steps with messages that say what changed for the user.
- Don't modify the old reference projects (`budget-web`, `budget-api`, `C:\Toolbox\DollarsAtWork`).
- Ask before adding a new dependency that isn't in the PLAN.md tech stack.
