using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Debts;

public static class DebtsEndpoints
{
    public const int MaxDebts = 50;
    private const decimal MaxApr = 100m;

    public static RouteGroupBuilder MapDebtsEndpoints(this RouteGroupBuilder api)
    {
        var debts = api.MapGroup("/debts").WithTags("Debts").RequireAuthorization();

        debts.MapGet("", GetDebts);
        debts.MapPost("", AddDebt).RequireFullAccess();
        debts.MapPut("/order", ReorderDebts).RequireFullAccess();
        debts.MapPut("/strategy", SetStrategy).RequireFullAccess();
        debts.MapPatch("/{id:guid}", UpdateDebt).RequireFullAccess();
        debts.MapDelete("/{id:guid}", DeleteDebt).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetDebts(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var strategy = await db.Plans.AsNoTracking().Where(p => p.UserId == userId).Select(p => (DebtStrategy?)p.DebtStrategy).SingleOrDefaultAsync(ct);
        if (strategy is null)
            return Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

        // The monthly amount lives on the plan's built-in Debt category and nowhere else.
        var budget = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId && c.Kind == CategoryKind.Debt)
            .Select(c => c.Amount)
            .SingleOrDefaultAsync(ct);

        var debts = await db.Debts.AsNoTracking().Where(d => d.UserId == userId).OrderBy(d => d.SortOrder).ToListAsync(ct);
        return Results.Ok(new DebtsResponse(strategy.Value.ToString(), budget, debts.Select(DebtResponse.From).ToList()));
    }

    private static async Task<IResult> AddDebt(AddDebtRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var check = new Validation();
        var name = check.Name("name", request.Name);
        var type = check.Enum<DebtType>("type", request.Type, "Pick a type of debt.");
        var balance = check.Amount("balance", request.Balance, "a balance");
        var apr = check.Percent("apr", request.Apr, "an APR", MaxApr);
        var minPayment = check.Amount("minPayment", request.MinPayment, "a minimum payment");
        if (check.Failed)
            return check.ToResult();

        var userId = principal.GetUserId();
        var existing = await db.Debts.Where(d => d.UserId == userId).Select(d => (int?)d.SortOrder).ToListAsync(ct);
        if (existing.Count >= MaxDebts)
        {
            check.Add("name", $"You can track up to {MaxDebts} debts.");
            return check.ToResult();
        }

        var now = clock.GetUtcNow();
        var debt = new Debt
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Type = type,
            Balance = balance,
            Apr = apr,
            MinPayment = minPayment,
            // A mortgage is paid on its own schedule unless the user says otherwise.
            MinimumOnly = request.MinimumOnly ?? type == DebtType.Mortgage,
            SortOrder = (existing.Max() ?? -1) + 1,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Debts.Add(debt);
        await db.SaveChangesAsync(ct);

        return Results.Ok(DebtResponse.From(debt));
    }

    private static async Task<IResult> UpdateDebt(Guid id, UpdateDebtRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var debt = await db.Debts.SingleOrDefaultAsync(d => d.Id == id && d.UserId == userId, ct);
        if (debt is null)
            return DebtMissing();

        var check = new Validation();
        if (request.Name is not null) debt.Name = check.Name("name", request.Name);
        if (request.Type is not null) debt.Type = check.Enum<DebtType>("type", request.Type, "Pick a type of debt.");
        if (request.Balance is not null) debt.Balance = check.Amount("balance", request.Balance, "a balance");
        if (request.Apr is not null) debt.Apr = check.Percent("apr", request.Apr, "an APR", MaxApr);
        if (request.MinPayment is not null) debt.MinPayment = check.Amount("minPayment", request.MinPayment, "a minimum payment");
        if (request.MinimumOnly is not null) debt.MinimumOnly = request.MinimumOnly.Value;
        if (check.Failed)
            return check.ToResult();

        debt.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.Ok(DebtResponse.From(debt));
    }

    private static async Task<IResult> DeleteDebt(Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var debt = await db.Debts.SingleOrDefaultAsync(d => d.Id == id && d.UserId == userId, ct);
        if (debt is null)
            return DebtMissing();

        db.Debts.Remove(debt);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderDebts(ReorderDebtsRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var debts = await db.Debts.Where(d => d.UserId == userId).ToListAsync(ct);
        var ids = request.Ids ?? [];

        // The list must be exactly this user's debts, each once.
        if (ids.Length != debts.Count || !ids.ToHashSet().SetEquals(debts.Select(d => d.Id)))
        {
            var check = new Validation();
            check.Add("ids", "The list of debts is out of date. Refresh and try again.");
            return check.ToResult();
        }

        var byId = debts.ToDictionary(d => d.Id);
        for (var i = 0; i < ids.Length; i++)
            byId[ids[i]].SortOrder = i;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> SetStrategy(SetDebtStrategyRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var check = new Validation();
        var strategy = check.Enum<DebtStrategy>("strategy", request.Strategy, "Pick snowball, avalanche or custom.");
        if (check.Failed)
            return check.ToResult();

        var userId = principal.GetUserId();
        var plan = await db.Plans.SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

        plan.DebtStrategy = strategy;
        plan.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static IResult DebtMissing() =>
        Results.Problem(title: "That debt no longer exists.", statusCode: StatusCodes.Status404NotFound);
}
