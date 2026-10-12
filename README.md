# Dollars at Work

A monthly money plan that puts every dollar to work: split your income into categories, and the built-in
Savings, Debt and Investments categories drive their own modules and a long-range net-worth projection.

The full plan lives in the **DollarsAtWork Rebuild Plan** doc. This repo is the from-scratch rebuild; the old
`budget-web` / `budget-api` projects are reference only.

## What's in Phase 1

- Sign up, sign in, sign out, forgot/reset password, confirm email (emails print to the API console for now)
- Every new account gets a plan, the three built-in categories and a 30-day free trial (no card)
- The app shell in the original look: dark theme, mascot, top navigation, trial banner
- Placeholder pages for Savings, Debt, Invest and Tools

## What's in Phase 2

- Plan page: monthly income, Allocated and Remaining (red with "Over-allocated by" when you plan more than you earn)
- Categories: add, rename, recolor, drag to reorder, delete with undo; amounts typed in dollars or as a percent of income
- Savings, Debt and Investments are locked: they can be reordered and re-amounted, not renamed or deleted
- "Scale all to new income" after an income change, and a donut of where the money goes
- Every change saves by itself; expired accounts can look but not edit

## Folder layout

```
server/DollarsAtWork.Api   .NET 10 API (Identity cookie sign-in, EF Core, SQL Server)
  Domain/                  Entities: AppUser, Plan, Category, Subscription
  Data/                    AppDbContext
  Common/                  Account setup, email, current-user helper
  Features/Auth/           Sign-up / sign-in endpoints
  Features/Plan/           Income and category endpoints
client/                    React 19 + TypeScript + Vite + Material UI
  src/theme.ts             The Dollars at Work look (colors, fonts, cards)
  src/api/                 One fetch wrapper for the API
  src/auth/                Signed-in user, sign-in hooks, route guards
  src/layout/              Top bar, trial banner, page frame
  src/features/plan/       The Plan page
  src/lib/money.ts         Money formatting and amount parsing
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

# 3. Create the first database migration (once)
dotnet ef migrations add InitialCreate --project server/DollarsAtWork.Api --output-dir Data/Migrations
```

The database itself is created automatically the first time the API starts in Development.

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

## Security rules this codebase follows

- The signed-in user comes only from the auth cookie. No endpoint accepts a user id.
- The cookie is HTTP-only, Secure and SameSite=Strict; nothing sensitive goes in browser storage.
- Sign-in locks for 15 minutes after 5 wrong passwords; auth endpoints are rate-limited per IP.
- Secrets live in configuration (user secrets in dev, app settings in production), never in code.
