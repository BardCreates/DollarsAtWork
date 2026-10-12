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
- Phase 7 (Dashboard) is built: net worth + slider, projection chart, milestones, cards, other items, assumptions,
  monthly check-in. Not yet browser-checked: today's dollars toggle, Assumptions and Other items dialogs, phone width.
- Next: finish verifying Phase 7, then Phase 8 (Trial and billing; needs Stripe test keys from the owner).

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

Dev emails (confirm, reset) are logged to the API console, not sent.
The API applies migrations automatically on startup in Development.

## Layout

```
server/DollarsAtWork.Api/
  Program.cs              DI, Identity cookie auth, rate limiting, endpoint mapping
  Domain/Entities.cs      AppUser, Plan, Category (+CategoryKind), Subscription (+status logic)
  Data/AppDbContext.cs    single EF Core context; Data/Migrations/
  Common/                 AccountSetup (new-account defaults), Email, CurrentUser, FullAccess (.RequireFullAccess()),
                          Validation (field checks -> ValidationProblem; use it in every new endpoint)
  Features/<Feature>/     <Feature>Endpoints.cs + <Feature>Contracts.cs (request/response records)
client/src/
  theme.ts                the brand: colors, fonts, card style, chartPalette
  api/client.ts           the ONLY fetch wrapper (api.get/post/put/patch/delete, ApiError, errorMessage)
  auth/                   useMe + auth mutations, route guards, passwordRule
  layout/                 TopBar, TrialBanner, AppShell
  components/             shared UI (PageHeader, Figure, PlanAmountBanner, Wordmark, ComingSoon, MoneyField, formHelpers.muiField)
  lib/money.ts            the ONLY money formatter/parser (formatMoney, formatPercent, parseMoneyInput)
  lib/dates.ts            months-from-now as text (formatMonthFromNow, formatDuration)
  lib/projection/         the projection engine: project(input) -> month-by-month result; rates are percents (7 = 7%)
  features/debt/          Debt page: debts.ts (query, mutations, useDebtProjection), list, dialog, chart, schedule
  features/savings/       Savings page: savings.ts (query, mutations, useSavingsProjection), goal list, dialog, timeline
  features/invest/        Invest page: investments.ts (query, mutations, useInvestmentProjection), account and split dialogs, chart
  features/plan/          Plan page: plan.ts (query + mutations), PlanPage, CategoryRow, AddCategoryForm, AllocationDonut
  pages/                  screens; new modules go in client/src/features/<feature>/
docs/PLAN.md              product spec
```

## Rules that must not be broken

**Security**
- The user id comes only from the auth cookie: `ClaimsPrincipal.GetUserId()`. Never accept a user id in
  a route, query or body. Every query on user data filters by that id.
- Every user-data endpoint calls `.RequireAuthorization()`. Writes also require full access
  (`Subscription.HasFullAccess(now)`); expired users are read-only, not locked out.
- No secrets in code or committed config. Use `dotnet user-secrets` in dev.
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
- Mobile works at 360px wide.

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
