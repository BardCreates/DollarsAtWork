using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Investments;

public static class InvestmentsEndpoints
{
    public const int MaxAccounts = 50;
    public const decimal DefaultExpectedReturn = 7m;
    private const decimal MaxReturn = 50m;
    private const decimal MaxMatch = 500m;

    public static RouteGroupBuilder MapInvestmentsEndpoints(this RouteGroupBuilder api)
    {
        var investments = api.MapGroup("/investments").WithTags("Investments").RequireAuthorization();

        investments.MapGet("", GetInvestments);
        investments.MapPut("/split", SetSplit).RequireFullAccess();
        investments.MapPost("/accounts", AddAccount).RequireFullAccess();
        investments.MapPut("/accounts/{id:guid}", ReplaceAccount).RequireFullAccess();
        investments.MapDelete("/accounts/{id:guid}", DeleteAccount).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetInvestments(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var income = await db.Plans.AsNoTracking().Where(p => p.UserId == userId).Select(p => (decimal?)p.MonthlyIncome).SingleOrDefaultAsync(ct);
        if (income is null)
            return Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

        // The monthly amount lives on the plan's built-in Investments category and nowhere else.
        var monthlyAmount = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId && c.Kind == CategoryKind.Investment)
            .Select(c => c.Amount)
            .SingleOrDefaultAsync(ct);

        return Results.Ok(new InvestmentsResponse(monthlyAmount, income.Value, (await LoadAccounts(db.InvestmentAccounts.AsNoTracking(), userId, ct)).Select(AccountResponse.From).ToList()));
    }

    private static async Task<IResult> AddAccount(SaveAccountRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var now = clock.GetUtcNow();
        var account = new InvestmentAccount { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };

        var check = Apply(account, request, now);
        if (check.Failed)
            return check.ToResult();

        var orders = await db.InvestmentAccounts.Where(a => a.UserId == userId).Select(a => (int?)a.SortOrder).ToListAsync(ct);
        if (orders.Count >= MaxAccounts)
        {
            check.Add("name", $"You can track up to {MaxAccounts} accounts.");
            return check.ToResult();
        }

        account.SortOrder = (orders.Max() ?? -1) + 1;
        // The first account takes the whole monthly amount; later ones start at 0% until the split is changed.
        account.SharePercent = orders.Count == 0 ? 100m : 0m;
        db.InvestmentAccounts.Add(account);
        await db.SaveChangesAsync(ct);
        return Results.Ok(AccountResponse.From(account));
    }

    private static async Task<IResult> ReplaceAccount(Guid id, SaveAccountRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var account = await db.InvestmentAccounts.SingleOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        if (account is null)
            return AccountMissing();

        var check = Apply(account, request, clock.GetUtcNow());
        if (check.Failed)
            return check.ToResult();

        await db.SaveChangesAsync(ct);
        return Results.Ok(AccountResponse.From(account));
    }

    /// <summary>Copies a request onto an account. Nothing is saved if the returned validation failed.</summary>
    private static Validation Apply(InvestmentAccount account, SaveAccountRequest request, DateTimeOffset now)
    {
        var check = new Validation();
        account.Name = check.Name("name", request.Name);
        account.Type = check.Enum<InvestmentAccountType>("type", request.Type, "Pick a type of account.");
        account.Balance = check.Amount("balance", request.Balance ?? 0m, "a balance");
        account.ExpectedReturn = check.Percent("expectedReturn", request.ExpectedReturn ?? DefaultExpectedReturn, "an expected return", MaxReturn);
        account.MatchPercent = request.MatchPercent is null ? null : check.Percent("matchPercent", request.MatchPercent, "a match", MaxMatch);
        account.MatchLimitPercent = request.MatchLimitPercent is null ? null : check.Percent("matchLimitPercent", request.MatchLimitPercent, "a match limit");
        account.MatchSalaryYearly = request.MatchSalaryYearly is null ? null : check.Amount("matchSalaryYearly", request.MatchSalaryYearly.Value, "a salary");
        account.PayrollMonthly = check.Amount("payrollMonthly", request.PayrollMonthly ?? 0m, "a paycheck amount");
        account.UpdatedAt = now;
        return check;
    }

    private static async Task<IResult> DeleteAccount(Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var accounts = await LoadAccounts(db.InvestmentAccounts, userId, ct);
        var account = accounts.SingleOrDefault(a => a.Id == id);
        if (account is null)
            return AccountMissing();

        db.InvestmentAccounts.Remove(account);

        // If exactly one account is left it must take everything; with more, the user re-splits.
        var remaining = accounts.Where(a => a.Id != id).ToList();
        if (remaining.Count == 1 && remaining[0].SharePercent != 100m)
        {
            remaining[0].SharePercent = 100m;
            remaining[0].UpdatedAt = clock.GetUtcNow();
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(remaining.Select(AccountResponse.From).ToList());
    }

    private static async Task<IResult> SetSplit(SetSplitRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var accounts = await LoadAccounts(db.InvestmentAccounts, userId, ct);
        var shares = request.Shares ?? [];
        var check = new Validation();

        // A share for exactly this user's accounts, each once.
        if (shares.Length != accounts.Count || !shares.Select(s => s.Id).ToHashSet().SetEquals(accounts.Select(a => a.Id)))
            check.Add("shares", "The list of accounts is out of date. Refresh and try again.");
        else if (shares.Any(s => s.SharePercent is not { } share || share < 0 || share > 100))
            check.Add("shares", "Each share must be between 0% and 100%.");
        else if (accounts.Count > 0 && Math.Abs(shares.Sum(s => s.SharePercent!.Value) - 100m) > 0.01m)
            check.Add("shares", "The shares must add up to 100%.");
        if (check.Failed)
            return check.ToResult();

        var now = clock.GetUtcNow();
        var byId = accounts.ToDictionary(a => a.Id);
        foreach (var share in shares)
        {
            byId[share.Id].SharePercent = share.SharePercent!.Value;
            byId[share.Id].UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);
        return Results.Ok(accounts.Select(AccountResponse.From).ToList());
    }

    private static Task<List<InvestmentAccount>> LoadAccounts(IQueryable<InvestmentAccount> accounts, Guid userId, CancellationToken ct) =>
        accounts.Where(a => a.UserId == userId).OrderBy(a => a.SortOrder).ToListAsync(ct);

    private static IResult AccountMissing() =>
        Results.Problem(title: "That account no longer exists.", statusCode: StatusCodes.Status404NotFound);
}
