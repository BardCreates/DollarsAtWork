# Dollars at Work — rebuild plan

Copy of the **DollarsAtWork Rebuild Plan** doc (Oct 11, 2026). If the two disagree, ask the owner which is current.

One monthly plan splits income into categories. Three protected categories (Savings, Debt, Investments)
feed their modules, and the dashboard projects net worth from that plan. The old code
(`C:\Users\hwhor\budget-web`, `C:\Users\hwhor\budget-api`, `C:\Toolbox\DollarsAtWork`) is reference only.

## What makes it stand out

Budgeting apps track the past and planners model retirement; Dollars at Work shows what this month's plan
turns into. The pitch: **plan your money, see your future, check in monthly.**

| Signature feature | What the user sees | Next step |
| --- | --- | --- |
| Move a dollar, see your future | Live panel beside the Plan list: "Debt-free 7 months sooner · +$18,400 net worth in 10 years" | 1 |
| Cost of a habit | Tap a category: "$250/month on Dining Out ≈ $43,000 in 10 years if invested" | 1 |
| Freed money rolls forward | "When your Visa is paid off in June, its $150 moves to your car loan" | 2 |
| Money timeline | Dashboard roadmap of milestones with dates; mascot cheers each one | 3 |
| What-if scenarios | Up to 3 saved plan versions compared on one chart (debt-free date, net worth at 10/20/30 yrs, interest) | 4 |
| Monthly report card | 60-second check-in: confirm balances → one-screen recap + email copy | 5 |
| A personality | Hard-hat mascot + one plain, encouraging voice everywhere | 7 |

Protect first if time runs short: Move a dollar, What-if scenarios, Monthly report card. All sit on the
projection engine that's already built and tested.

**Getting people in and keeping them**
- Free public calculators (early payoff, debt snowball, DRIP, cost of a habit), no account; each ends with a trial call to action.
- Under 3 minutes to a first projection: guided setup (income, three amounts, one debt) → dashboard with their 10-year number. Sample-data demo for visitors.
- Private by design: no bank login; security page; data export.
- Phone-first: installable PWA; Plan and Debt designed for phones first.
- Price to test: $6–8/month or $49–69/year, 30-day no-card trial.

## How money flows

```
Monthly take-home income
        │
        ▼
Planning module ── Remaining = income − all category amounts
 ├─ Custom categories (Rent, Groceries…)  → spent, not projected
 ├─ Savings      (built-in, locked) → Savings module    (fills goals in order)
 ├─ Debt         (built-in, locked) → Debt module       (snowball or avalanche)
 └─ Investments  (built-in, locked) → Investment module (split across accounts)
                                          │
Monthly check-in (confirm balances) ──► Projection engine (month by month;
                                          paid-off debts and full goals roll money forward)
                                          │
                                          ▼
                                     Dashboard (net worth today, 0–40 year slider, milestones, charts)
```

## Look and feel (kept from budget-web)

| Element | Design |
| --- | --- |
| Theme | Dark mode; background #181a20, cards #23272f with gradient #2a2e35 → #1f232a |
| Brand color | Mascot green #19c37d: buttons, links, active tab, positive numbers |
| Accent | Pink #ff4081 for highlights; red for debt and over-budget |
| Type | Inter for text; Coiny for the "Dollars at Work" wordmark |
| Corners | 14 px cards, 10 px buttons; sentence-case buttons |
| Header | Fixed top bar: mascot + wordmark left; Dashboard, Plan, Savings, Debt, Invest, Tools; profile icon right |
| Trial banner | Under the top bar on every page |
| Dashboard | Large net-worth card left with the slider; smaller cards stacked right; one column on phones |
| Module pages | Title, then summary figures, then tabs (Overview, Schedule or Timeline) |
| Mascot | Header, sign-in, empty states, milestone celebrations (confetti) |

Charts use the brand palette (`chartPalette` in `client/src/theme.ts`). On phones the nav collapses into a menu.

## Planning module

**Remaining = Monthly income − sum of all category amounts.**

- Remaining is green above $0, neutral at $0, red below $0 with "Over-allocated by $X". Saving is allowed when red; the dashboard warns.
- Row: drag handle, name, amount, share of income (%), color, delete. Amount can be typed as $ or % of income; always stored as dollars.
- Custom categories: add, rename, reorder, delete.
- Built-ins (Savings, Debt, Investments): created at sign-up with $0, lock icon, "Go to module" link; reorder and change amount; cannot delete or rename.
- Changing income keeps dollar amounts fixed (Remaining moves). A "Scale all to new income" button covers the other case.
- Edits autosave; delete has an undo toast; reorder saves on drop.
- Donut beside the list; Remaining is a grey slice.

| Built-in | Becomes in its module | Guard rail |
| --- | --- | --- |
| Savings | Monthly money spread across savings goals | None |
| Debt | Monthly debt budget: minimums first, rest to the target debt | Warn if below the sum of minimums |
| Investments | Monthly contribution split across accounts by % | Splits must total 100% |

## Savings, Debt and Investment modules

Each module opens with a banner: "$400/month from your plan — Edit in Plan". Modules never store their own copy of that number.

**Savings**
- Goals: name, target, current balance, optional target date, optional APY, priority.
- Split mode: *Priority* (fill top to bottom) or *Percent* (fixed shares).
- Each goal: progress bar, monthly amount, projected completion; dated goals show "on track" or "needs $X/month more".
- First-visit template: Emergency fund = 3–6 months of planned expenses (from custom categories).
- A finished goal's money moves to the next goal.

**Debt**
- Debts: name, type (credit card, auto, student, mortgage, medical, other), balance, APR, minimum payment.
- Strategy: *Snowball* (smallest balance first), *Avalanche* (highest APR first), *Custom* (drag order).
- Monthly: pay every minimum, rest goes to the target debt; a paid-off debt's minimum rolls to the next.
- Output: debt-free date, total interest, month-by-month schedule, comparison vs minimums only.
- Chart: stacked balance per debt over time.

**Investments**
- Accounts: name, type (401(k), IRA, Roth IRA, brokerage, HSA, other), balance, expected annual return (default 7%), share of the monthly amount, optional employer match (% matched up to % of salary).
- Output: value at 5/10/20/30 years; contributed vs growth.
- Chart: contributions vs growth over time.

Balances change only when the user updates them. A monthly check-in asks the user to confirm balances and records a net-worth snapshot.

## Dashboard

**Net worth = savings + investments + other assets − debts − other liabilities.** Other assets/liabilities (home, car…) are a manual list.

**Projection engine** — one month-by-month simulation shared by the modules and the dashboard:
1. Start from current balances and this month's built-in amounts.
2. Each month: goals get their share and earn APY; debts accrue interest and get minimums + extra; investments get contributions + match and grow monthly.
3. A paid-off debt's money stays in the debt budget for the next debt. When all debt is gone, the debt budget moves to a user-chosen destination (default Investments).
4. When all goals are full, savings money moves to a user-chosen destination (default Investments).
5. Toggles: today's dollars (inflation, default 3%); yearly income raise (default 0%, added to Remaining).

Pure TypeScript, no server calls (instant slider), unit-tested against hand-checked loan and growth examples.

| Card | Shows |
| --- | --- |
| Net worth + slider | Today, value at slider year, change, assets vs debts |
| Projection chart | Stacked area: savings, investments, minus debt; net-worth line on top |
| Milestones | Debt-free date, emergency fund full, $100k, $1M, each goal's date |
| This month's plan | Allocation donut + Remaining, over-allocated warning |
| Debt payoff | Total debt falling to $0 with debt-free date |
| Savings goals | Progress bars with projected dates |
| Net worth history | Snapshots from check-ins (empty state until the second) |
| Assets vs liabilities | Horizontal bars by type |

Projection note on screen: "Estimates based on your plan and assumed returns, not financial advice."

## Accounts, 30-day trial and subscription

- Email + password only in version 1 (Google sign-in and 2FA after v1). Email verification, remember me, forgot/reset password, change email/password.
- Lockout after 5 failed sign-ins for 15 minutes.
- Delete account (removes all data, cancels Stripe) and export data (JSON/CSV).
- First-run setup: income → built-in amounts → optional first debt, goal, account.

| Status | Access | Starts when | User sees |
| --- | --- | --- | --- |
| Trialing | Full | Sign-up; ends 30 days later; **no card** | "X days left" banner; emails day 23, 28, expiry |
| Active | Full until 3 days past the paid period, unless Stripe renews it | Stripe confirms payment | Settings → Billing opens Stripe portal |
| PastDue | Full for 7 days | Payment fails | "Update your card" banner |
| Canceled | Full until period end | User cancels | "Ends on [date]" + resubscribe |
| Expired | Read-only | Trial/period ends unpaid, or Stripe pauses the subscription | Data visible, editing blocked, Subscribe everywhere |

Rules: access checked on the server for every write; read-only not locked out; monthly + annual prices set in Stripe (placeholders in test mode for now); one trial per email.

## Tech stack

| Layer | Choice |
| --- | --- |
| API | ASP.NET Core .NET 10, minimal APIs grouped by feature |
| Database | SQL Server (LocalDB dev, Azure SQL prod), EF Core code-first migrations, one context |
| Sign-in | ASP.NET Core Identity, HTTP-only cookies |
| Billing | Stripe Checkout, Customer Portal, webhooks |
| Email | Postmark or Resend (dev: logged to console) |
| Front end | React 19 + TypeScript + Vite, React Router |
| UI | Material UI v7 + Material icons, one theme file |
| Data fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Drag and drop | @hello-pangea/dnd |
| Charts | Recharts, colors from the theme |
| Celebrations | canvas-confetti + mascot |
| Tests | xUnit (API), Vitest (engine, UI), Playwright (sign-up → plan → dashboard) |
| Hosting | Azure App Service serving API + built React app on one domain |

## Data model

Money is `decimal(19,4)`. Every row except Identity's belongs to one user; deleting a user deletes their rows. All tables have CreatedAt/UpdatedAt.

| Table | Key fields | Notes |
| --- | --- | --- |
| Users (Identity) | Email, password hash, confirmed, lockout | |
| Plans | MonthlyIncome, Currency, DebtStrategy, SavingsSplitMode, DebtDoneDestination, SavingsDoneDestination, InflationRate, IncomeGrowthRate | One per user |
| Categories | Name, Kind (Custom/Savings/Debt/Investment), Amount, SortOrder, Color | Unique (UserId, Kind) for built-ins |
| SavingsGoals | Name, TargetAmount, CurrentBalance, TargetDate?, Apy, Priority, SharePercent | |
| Debts | Name, Type, Balance, Apr, MinPayment, MinimumOnly, SortOrder | MinimumOnly (default on for Mortgage): paid its minimum, out of the payoff order and the debt-free month |
| InvestmentAccounts | Name, Type, Balance, ExpectedReturn, SharePercent, MatchPercent, MatchLimitPercent | Shares total 100% |
| OtherItems | Name, Kind (Asset/Liability), Type, Value, YearlyChangePercent | YearlyChangePercent moves the value in the projection (Home suggests 3, Vehicle −10, else 0) |
| NetWorthSnapshots | Date, Assets, Liabilities, NetWorth | Written at check-in |
| Subscriptions | Status, TrialEndsAt, CurrentPeriodEnd, PastDueSince, BillingInterval, StripeCustomerId, StripeSubscriptionId | Changed only by sign-up and Stripe webhooks |
| ProcessedStripeEvents | EventId, ReceivedAt | Webhook idempotency |
| Scenarios | Name, SortOrder, Overrides (JSON: income, category amounts, projection settings) | Up to 3 per user; never changes the real plan |

## Build status and next work

**Built (Phases 1–10, verified):** foundation and sign-in, Plan, projection engine (35 tests), Debt, Savings,
Investments, Dashboard (slider, milestones, monthly check-in), trial + Stripe billing (test mode), Tools
(compound interest, early payoff, loan comparison, DRIP), launch basics (change email/password, export,
delete account, /welcome walkthrough, pricing page, draft terms/privacy, 360px pass).

**Added Oct 15:** a home page for signed-out visitors (pitch, live sample-plan slider, sign in / start free, links to the
calculators, help and security), a launch waitlist (email only, no account), first-time hints on every page with a
dashboard tour (close one, hide all, turn back on in Profile), a searchable help guide at /help, and a tooltip on the
Today's dollars switch.
A blog at /blog inside the app (posts are Markdown files in the repo; drafts stay hidden until published). A separate
static blog site at blog.dollarsatwork.app comes later.

**Waiting on the owner for launch:** hosting + domain, real email provider, error tracking, legal review of
terms/privacy, final prices, production Stripe webhook.

**Next: stand-out work, in this order**

1. **Move a dollar** — live impact panel on the Plan page (debt-free date and 10-year net worth vs the saved plan) and cost-of-a-habit per category.
2. **Rollover messages** — on Debt and Savings, say where each paid-off debt's or finished goal's money goes next, and when.
3. **Money timeline** — dashboard milestones become a dated roadmap with mascot celebrations (confetti) as each nears.
4. **What-if scenarios** — up to 3 saved plan versions (new Scenarios table) compared on one chart: debt-free date, net worth at 10/20/30 years, interest paid.
5. **Monthly report card** — extend the check-in with a one-screen recap of the month and an email copy.
6. **Public calculators and demo** — Tools calculators open to signed-out visitors, add cost-of-a-habit, each ends with a trial call to action; sample-data demo; tighten /welcome so a new user sees their own 10-year number in under 3 minutes.
7. **Launch polish** — installable PWA, security page ("no bank login"), voice pass so all copy sounds like the mascot.

## Decisions (Oct 11–12, 2026)

- Price: placeholder monthly + annual prices in Stripe test mode for now.
- Trial: 30 days, no card.
- Income: one monthly number.
- Plan only at launch; spending tracker later.
- Gamification: keep confetti + mascot for milestones; no XP/levels.
- No Google sign-in in version 1.
- Home, car and other assets count toward net worth (manual list). A house is an asset here; its mortgage is a Debt (minimum only by default). Equity = value − balance, counted from day one. (Oct 17)
- Stay on .NET + SQL Server.
- Focus (Oct 12): compete on the plan-to-future connection, not on tracking.
- No bank linking in version 1; "no bank login" is part of the pitch. Revisit only as a paid add-on if paying users ask.
- Spending tracker after launch: planned vs actual per category, manual entry or bank CSV import.
