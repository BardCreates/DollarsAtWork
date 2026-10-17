using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Savings;

public static class SavingsEndpoints
{
    public const int MaxGoals = 50;
    private const decimal MaxApy = 100m;

    public static RouteGroupBuilder MapSavingsEndpoints(this RouteGroupBuilder api)
    {
        var savings = api.MapGroup("/savings").WithTags("Savings").RequireAuthorization();

        savings.MapGet("", GetSavings);
        savings.MapPut("/split-mode", SetSplitMode).RequireFullAccess();
        savings.MapPost("/goals", AddGoal).RequireFullAccess();
        savings.MapPut("/goals/order", ReorderGoals).RequireFullAccess();
        savings.MapPut("/goals/{id:guid}", ReplaceGoal).RequireFullAccess();
        savings.MapDelete("/goals/{id:guid}", DeleteGoal).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetSavings(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var splitMode = await db.Plans.AsNoTracking().Where(p => p.UserId == userId).Select(p => (SavingsSplitMode?)p.SavingsSplitMode).SingleOrDefaultAsync(ct);
        if (splitMode is null)
            return PlanMissing();

        // Both numbers come from the plan's categories (and the debts' minimums) and are stored nowhere else.
        var categories = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId && (c.Kind == CategoryKind.Savings || c.Kind == CategoryKind.Custom))
            .Select(c => new { c.Kind, c.Amount })
            .ToListAsync(ct);
        var monthlyAmount = categories.Where(c => c.Kind == CategoryKind.Savings).Sum(c => c.Amount);
        // An emergency has to keep paying the bills and every debt's minimum (a mortgage included), so both count.
        var debtMinimums = await db.Debts.AsNoTracking()
            .Where(d => d.UserId == userId && d.Balance > 0)
            .Select(d => d.MinPayment)
            .ToListAsync(ct);
        var plannedExpenses = categories.Where(c => c.Kind == CategoryKind.Custom).Sum(c => c.Amount) + debtMinimums.Sum();

        var goals = await db.SavingsGoals.AsNoTracking().Where(g => g.UserId == userId).OrderBy(g => g.Priority).ToListAsync(ct);
        return Results.Ok(new SavingsResponse(splitMode.Value.ToString(), monthlyAmount, plannedExpenses, goals.Select(GoalResponse.From).ToList()));
    }

    private static async Task<IResult> AddGoal(SaveGoalRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var now = clock.GetUtcNow();
        var goal = new SavingsGoal { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };

        var check = Apply(goal, request, now);
        if (check.Failed)
            return check.ToResult();

        var priorities = await db.SavingsGoals.Where(g => g.UserId == userId).Select(g => (int?)g.Priority).ToListAsync(ct);
        if (priorities.Count >= MaxGoals)
        {
            check.Add("name", $"You can have up to {MaxGoals} goals.");
            return check.ToResult();
        }

        goal.Priority = (priorities.Max() ?? -1) + 1;
        db.SavingsGoals.Add(goal);
        await db.SaveChangesAsync(ct);
        return Results.Ok(GoalResponse.From(goal));
    }

    private static async Task<IResult> ReplaceGoal(Guid id, SaveGoalRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var goal = await db.SavingsGoals.SingleOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);
        if (goal is null)
            return GoalMissing();

        var check = Apply(goal, request, clock.GetUtcNow());
        if (check.Failed)
            return check.ToResult();

        await db.SaveChangesAsync(ct);
        return Results.Ok(GoalResponse.From(goal));
    }

    /// <summary>Copies a request onto a goal. Nothing is saved if the returned validation failed.</summary>
    private static Validation Apply(SavingsGoal goal, SaveGoalRequest request, DateTimeOffset now)
    {
        var check = new Validation();
        goal.Name = check.Name("name", request.Name);
        goal.TargetAmount = check.Amount("targetAmount", request.TargetAmount, "a target");
        goal.CurrentBalance = check.Amount("currentBalance", request.CurrentBalance ?? 0m, "a balance");
        goal.Apy = check.Percent("apy", request.Apy ?? 0m, "an APY", MaxApy);
        goal.SharePercent = check.Percent("sharePercent", request.SharePercent ?? 0m, "a share");
        if (request.TargetAmount is <= 0)
            check.Add("targetAmount", "Enter a target above $0.");
        if (request.TargetDate is { } date && (date.Year < 2000 || date.Year > 2200))
            check.Add("targetDate", "Enter a realistic target date.");
        goal.TargetDate = request.TargetDate;
        goal.UpdatedAt = now;
        return check;
    }

    private static async Task<IResult> DeleteGoal(Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var goal = await db.SavingsGoals.SingleOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);
        if (goal is null)
            return GoalMissing();

        db.SavingsGoals.Remove(goal);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderGoals(ReorderGoalsRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var goals = await db.SavingsGoals.Where(g => g.UserId == userId).ToListAsync(ct);
        var ids = request.Ids ?? [];

        // The list must be exactly this user's goals, each once.
        if (ids.Length != goals.Count || !ids.ToHashSet().SetEquals(goals.Select(g => g.Id)))
        {
            var check = new Validation();
            check.Add("ids", "The list of goals is out of date. Refresh and try again.");
            return check.ToResult();
        }

        var byId = goals.ToDictionary(g => g.Id);
        for (var i = 0; i < ids.Length; i++)
            byId[ids[i]].Priority = i;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> SetSplitMode(SetSplitModeRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var check = new Validation();
        var splitMode = check.Enum<SavingsSplitMode>("splitMode", request.SplitMode, "Pick priority or percent.");
        if (check.Failed)
            return check.ToResult();

        var userId = principal.GetUserId();
        var plan = await db.Plans.SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        plan.SavingsSplitMode = splitMode;
        plan.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static IResult PlanMissing() =>
        Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

    private static IResult GoalMissing() =>
        Results.Problem(title: "That goal no longer exists.", statusCode: StatusCodes.Status404NotFound);
}
