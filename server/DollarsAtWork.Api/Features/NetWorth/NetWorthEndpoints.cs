using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Features.NetWorth;

/// <summary>
/// What the dashboard needs beyond the plan and the three modules: other assets and liabilities,
/// projection settings, and the monthly check-in with its net-worth snapshots.
/// </summary>
public static class NetWorthEndpoints
{
    public const int MaxItems = 50;
    private const decimal MaxRate = 20m;
    /// <summary>A home or car can't gain or lose more than this a year; wilder guesses say more about the guess than the asset.</summary>
    private const decimal MaxYearlyChange = 50m;

    public static RouteGroupBuilder MapNetWorthEndpoints(this RouteGroupBuilder api)
    {
        var netWorth = api.MapGroup("/networth").WithTags("NetWorth").RequireAuthorization();

        netWorth.MapGet("", GetNetWorth);
        netWorth.MapPut("/settings", SaveSettings).RequireFullAccess();
        netWorth.MapPost("/items", AddItem).RequireFullAccess();
        netWorth.MapPut("/items/{id:guid}", ReplaceItem).RequireFullAccess();
        netWorth.MapDelete("/items/{id:guid}", DeleteItem).RequireFullAccess();
        netWorth.MapPost("/check-in", CheckIn).RequireFullAccess();
        // Reading your own recap by email changes nothing, so it stays open to expired accounts.
        netWorth.MapPost("/report/email", EmailReport).RequireRateLimiting(RateLimits.Auth);

        return api;
    }

    private static async Task<IResult> GetNetWorth(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        return plan is null ? PlanMissing() : Results.Ok(await BuildResponse(db, userId, plan, ct));
    }

    private static async Task<NetWorthResponse> BuildResponse(AppDbContext db, Guid userId, Domain.Plan plan, CancellationToken ct)
    {
        var items = await db.OtherItems.AsNoTracking().Where(i => i.UserId == userId).OrderBy(i => i.SortOrder).ToListAsync(ct);
        var snapshots = await db.NetWorthSnapshots.AsNoTracking().Where(s => s.UserId == userId).OrderBy(s => s.Date).ToListAsync(ct);
        return new NetWorthResponse(SettingsResponse.From(plan), items.Select(OtherItemResponse.From).ToList(), snapshots.Select(SnapshotResponse.From).ToList());
    }

    private static async Task<IResult> SaveSettings(SaveSettingsRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var check = new Validation();
        var debtDone = check.Enum<FreedMoneyDestination>("debtDoneDestination", request.DebtDoneDestination, "Pick where the debt money goes next.");
        var savingsDone = check.Enum<FreedMoneyDestination>("savingsDoneDestination", request.SavingsDoneDestination, "Pick where the savings money goes next.");
        var inflation = check.Percent("inflationRate", request.InflationRate, "an inflation rate", MaxRate);
        var raise = check.Percent("incomeGrowthRate", request.IncomeGrowthRate, "a yearly raise", MaxRate);
        // Money can't be sent back to the job it has just finished.
        if (debtDone == FreedMoneyDestination.Debt)
            check.Add("debtDoneDestination", "Pick investments, savings or remaining.");
        if (savingsDone == FreedMoneyDestination.Savings)
            check.Add("savingsDoneDestination", "Pick investments, debt or remaining.");
        if (check.Failed)
            return check.ToResult();

        var userId = principal.GetUserId();
        var plan = await db.Plans.SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        plan.DebtDoneDestination = debtDone;
        plan.SavingsDoneDestination = savingsDone;
        plan.InflationRate = inflation;
        plan.IncomeGrowthRate = raise;
        // Left out by an older client: keep what was there.
        plan.RaiseToInvestments = request.RaiseToInvestments ?? plan.RaiseToInvestments;
        plan.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.Ok(SettingsResponse.From(plan));
    }

    private static async Task<IResult> AddItem(SaveOtherItemRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var now = clock.GetUtcNow();
        var item = new OtherItem { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };

        var check = Apply(item, request, now);
        if (check.Failed)
            return check.ToResult();

        var orders = await db.OtherItems.Where(i => i.UserId == userId).Select(i => (int?)i.SortOrder).ToListAsync(ct);
        if (orders.Count >= MaxItems)
        {
            check.Add("name", $"You can list up to {MaxItems} items.");
            return check.ToResult();
        }

        item.SortOrder = (orders.Max() ?? -1) + 1;
        db.OtherItems.Add(item);
        await db.SaveChangesAsync(ct);
        return Results.Ok(OtherItemResponse.From(item));
    }

    private static async Task<IResult> ReplaceItem(Guid id, SaveOtherItemRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var item = await db.OtherItems.SingleOrDefaultAsync(i => i.Id == id && i.UserId == userId, ct);
        if (item is null)
            return ItemMissing();

        var check = Apply(item, request, clock.GetUtcNow());
        if (check.Failed)
            return check.ToResult();

        await db.SaveChangesAsync(ct);
        return Results.Ok(OtherItemResponse.From(item));
    }

    /// <summary>Copies a request onto an item. Nothing is saved if the returned validation failed.</summary>
    private static Validation Apply(OtherItem item, SaveOtherItemRequest request, DateTimeOffset now)
    {
        var check = new Validation();
        item.Name = check.Name("name", request.Name);
        item.Kind = check.Enum<OtherItemKind>("kind", request.Kind, "Pick asset or liability.");
        item.Type = check.Enum<OtherItemType>("type", request.Type, "Pick a type.");
        item.Value = check.Amount("value", request.Value, "a value");
        item.YearlyChangePercent = check.SignedPercent("yearlyChangePercent", request.YearlyChangePercent ?? 0m, "a yearly change", MaxYearlyChange);
        item.UpdatedAt = now;
        return check;
    }

    private static async Task<IResult> DeleteItem(Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var item = await db.OtherItems.SingleOrDefaultAsync(i => i.Id == id && i.UserId == userId, ct);
        if (item is null)
            return ItemMissing();

        db.OtherItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    /// <summary>Updates the confirmed balances and records this month's snapshot, all or nothing.</summary>
    private static async Task<IResult> CheckIn(CheckInRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        var goals = await db.SavingsGoals.Where(g => g.UserId == userId).ToListAsync(ct);
        var debts = await db.Debts.Where(d => d.UserId == userId).ToListAsync(ct);
        var accounts = await db.InvestmentAccounts.Where(a => a.UserId == userId).ToListAsync(ct);
        var items = await db.OtherItems.Where(i => i.UserId == userId).ToListAsync(ct);
        var now = clock.GetUtcNow();
        var check = new Validation();

        // Every id must belong to this user; an unknown one fails the whole check-in.
        void Update<T>(string field, BalanceUpdate[]? updates, List<T> rows, Func<T, Guid> id, Action<T, decimal> set)
        {
            foreach (var update in updates ?? [])
            {
                var row = rows.SingleOrDefault(r => id(r) == update.Id);
                if (row is null)
                    check.Add(field, "This list is out of date. Refresh and try again.");
                else
                    set(row, check.Amount(field, update.Balance, "a balance"));
            }
        }

        Update("goals", request.Goals, goals, g => g.Id, (g, balance) => { g.CurrentBalance = balance; g.UpdatedAt = now; });
        Update("debts", request.Debts, debts, d => d.Id, (d, balance) => { d.Balance = balance; d.UpdatedAt = now; });
        Update("accounts", request.Accounts, accounts, a => a.Id, (a, balance) => { a.Balance = balance; a.UpdatedAt = now; });
        Update("items", request.Items, items, i => i.Id, (i, value) => { i.Value = value; i.UpdatedAt = now; });
        if (check.Failed)
            return check.ToResult();

        var assets = goals.Sum(g => g.CurrentBalance) + accounts.Sum(a => a.Balance) + items.Where(i => i.Kind == OtherItemKind.Asset).Sum(i => i.Value);
        var liabilities = debts.Sum(d => d.Balance) + items.Where(i => i.Kind == OtherItemKind.Liability).Sum(i => i.Value);

        // One snapshot per calendar month: checking in again replaces it.
        var today = EmailDates.Today(request.Today, now);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var snapshot = await db.NetWorthSnapshots.SingleOrDefaultAsync(s => s.UserId == userId && s.Date >= monthStart && s.Date < monthStart.AddMonths(1), ct);
        if (snapshot is null)
        {
            snapshot = new NetWorthSnapshot { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };
            db.NetWorthSnapshots.Add(snapshot);
        }
        snapshot.Date = today;
        snapshot.Savings = goals.Sum(g => g.CurrentBalance);
        snapshot.Investments = accounts.Sum(a => a.Balance);
        snapshot.Debts = debts.Sum(d => d.Balance);
        snapshot.Assets = assets;
        snapshot.Liabilities = liabilities;
        snapshot.NetWorth = assets - liabilities;
        snapshot.UpdatedAt = now;

        await db.SaveChangesAsync(ct);
        return Results.Ok(await BuildResponse(db, userId, plan, ct));
    }

    /// <summary>Emails the signed-in user a copy of their latest check-in recap, at their own address only.</summary>
    private static async Task<IResult> EmailReport(
        ReportEmailRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AppDbContext db,
        IAppEmailSender sender,
        IOptions<AppOptions> options,
        TimeProvider clock,
        CancellationToken ct)
    {
        var check = new Validation();
        if (request.DebtFreeOn is { Length: > 7 })
            check.Add("debtFreeOn", "That date isn't valid.");
        if (request.DebtFreeMonth is < 0 or > ReportEmail.MaxMonths)
            check.Add("debtFreeMonth", "That date isn't valid.");
        if (request.NetWorthIn10Years is { } ten && Math.Abs(ten) > ReportEmail.MaxNetWorth)
            check.Add("netWorthIn10Years", "That amount isn't valid.");
        if (check.Failed)
            return check.ToResult();

        var userId = principal.GetUserId();
        var user = await users.FindByIdAsync(userId.ToString());
        if (user?.Email is null)
            return Results.Unauthorized();

        var latestTwo = await db.NetWorthSnapshots.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.Date)
            .Take(2)
            .ToListAsync(ct);
        if (latestTwo.Count == 0)
            return Results.Problem(title: "Do a check-in first.", detail: "There's nothing to send until you've done a check-in.", statusCode: StatusCodes.Status409Conflict);

        var message = ReportEmail.Compose(latestTwo[0], latestTwo.Count > 1 ? latestTwo[1] : null, request, clock.GetUtcNow(), options.Value.PublicUrl.TrimEnd('/'));
        await sender.SendAsync(user.Email, message, ct);
        return Results.NoContent();
    }

    private static IResult PlanMissing() =>
        Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

    private static IResult ItemMissing() =>
        Results.Problem(title: "That item no longer exists.", statusCode: StatusCodes.Status404NotFound);
}
