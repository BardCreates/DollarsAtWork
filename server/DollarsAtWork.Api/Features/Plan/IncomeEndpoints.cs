using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Plan;

/// <summary>
/// Income sources: two jobs, a partner's pay, freelance work. While any exist, the plan's monthly income is their
/// monthly equivalents added up (to the cent), kept in Plan.MonthlyIncome so everything else reads it as before.
/// Deleting the last one leaves the income where it was.
/// </summary>
public static class IncomeEndpoints
{
    public const int MaxSources = 20;

    public static RouteGroupBuilder MapIncomeEndpoints(this RouteGroupBuilder api)
    {
        var incomes = api.MapGroup("/plan/incomes").WithTags("Plan").RequireAuthorization();

        incomes.MapGet("", GetIncomes);
        incomes.MapPost("", AddSource).RequireFullAccess();
        incomes.MapPut("/{id:guid}", ReplaceSource).RequireFullAccess();
        incomes.MapDelete("/{id:guid}", DeleteSource).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetIncomes(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        return plan is null ? PlanMissing() : Results.Ok(new IncomesResponse(plan.MonthlyIncome, (await Load(db, userId, ct)).Select(IncomeSourceResponse.From).ToList()));
    }

    private static async Task<IResult> AddSource(SaveIncomeSourceRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var now = clock.GetUtcNow();
        var source = new IncomeSource { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };
        var check = Apply(source, request, now);
        if (check.Failed)
            return check.ToResult();

        var sources = await Load(db, userId, ct);
        if (sources.Count >= MaxSources)
        {
            check.Add("name", $"You can add up to {MaxSources} income sources.");
            return check.ToResult();
        }
        source.SortOrder = sources.Count == 0 ? 0 : sources.Max(s => s.SortOrder) + 1;
        db.IncomeSources.Add(source);
        sources.Add(source);
        return await SaveAndRespond(db, userId, sources, now, ct);
    }

    private static async Task<IResult> ReplaceSource(Guid id, SaveIncomeSourceRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var sources = await Load(db, userId, ct);
        var source = sources.SingleOrDefault(s => s.Id == id);
        if (source is null)
            return SourceMissing();

        var now = clock.GetUtcNow();
        var check = Apply(source, request, now);
        if (check.Failed)
            return check.ToResult();
        return await SaveAndRespond(db, userId, sources, now, ct);
    }

    private static async Task<IResult> DeleteSource(Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var sources = await Load(db, userId, ct);
        var source = sources.SingleOrDefault(s => s.Id == id);
        if (source is null)
            return SourceMissing();

        db.IncomeSources.Remove(source);
        sources.Remove(source);
        return await SaveAndRespond(db, userId, sources, clock.GetUtcNow(), ct);
    }

    /// <summary>Saves, then sets the plan's income to the sources' total (unless none are left) and answers with both.</summary>
    private static async Task<IResult> SaveAndRespond(AppDbContext db, Guid userId, List<IncomeSource> sources, DateTimeOffset now, CancellationToken ct)
    {
        var plan = await db.Plans.SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        if (sources.Count > 0)
        {
            var total = Math.Round(sources.Sum(s => s.MonthlyAmount), 2, MidpointRounding.AwayFromZero);
            plan.MonthlyIncome = Math.Min(total, PlanEndpoints.MaxAmount);
            plan.UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);
        return Results.Ok(new IncomesResponse(plan.MonthlyIncome, sources.OrderBy(s => s.SortOrder).Select(IncomeSourceResponse.From).ToList()));
    }

    private static Validation Apply(IncomeSource source, SaveIncomeSourceRequest request, DateTimeOffset now)
    {
        var check = new Validation();
        source.Name = check.Name("name", request.Name);
        source.Amount = check.Amount("amount", request.Amount, "an amount");
        source.Frequency = check.Enum<IncomeFrequency>("frequency", request.Frequency, "Pick how often it pays.");
        source.UpdatedAt = now;
        return check;
    }

    private static Task<List<IncomeSource>> Load(AppDbContext db, Guid userId, CancellationToken ct) =>
        db.IncomeSources.Where(s => s.UserId == userId).OrderBy(s => s.SortOrder).ToListAsync(ct);

    private static IResult PlanMissing() =>
        Results.Problem(title: "Your plan wasn't found.", statusCode: StatusCodes.Status404NotFound);

    private static IResult SourceMissing() =>
        Results.Problem(title: "That income source no longer exists. Refresh and try again.", statusCode: StatusCodes.Status404NotFound);
}
