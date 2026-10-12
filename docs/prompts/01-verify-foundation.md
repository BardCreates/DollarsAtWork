Read CLAUDE.md and docs/PLAN.md first.

Phase 1 (Foundation) was written without a compiler, so nothing has been built or run yet. Your job is to get it
working end to end on this machine, then stop. Don't start Phase 2.

1. Check prerequisites: .NET 10 SDK, Node 20+, SQL Server LocalDB. If anything is missing, tell me what to install and stop.
2. Run `dotnet tool restore`, then `dotnet build server/DollarsAtWork.Api`. Fix every error and warning in our code.
3. In `client/`, run `npm install` and `npm run typecheck`. Fix every error.
4. Create the first migration: `dotnet ef migrations add InitialCreate --project server/DollarsAtWork.Api --output-dir Data/Migrations`.
   Review it: unique (UserId, Kind) filtered index on Categories, decimal(19,4) money columns, enums as strings, cascade deletes.
5. Start the API and confirm it creates the DollarsAtWork2 database and answers `GET https://localhost:7180/api/health`.
6. With the API running, test the auth flow against the API (curl or a small script, keeping cookies):
   register → me (status Trialing, 30 days left) → logout → me returns 401 → login → wrong password 5 times locks the account →
   forgot-password logs a reset link → reset-password works. Also confirm the new user has a Plan, exactly 3 built-in
   categories (Savings, Debt, Investments) and a Trialing subscription in the database.
7. Run `npm run build` to confirm the production build works.
8. Initialize git, commit everything as "Phase 1: foundation", and add `.github/workflows/ci.yml`
   that builds the API and the client on push.

When you're done, tell me: what you fixed, anything that still doesn't work, and the exact commands for me to
run the app and click through sign-up myself.
