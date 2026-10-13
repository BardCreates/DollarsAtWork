using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Scenarios;

/// <summary>Saved "what if" versions of the plan. Nothing here ever changes the real plan.</summary>
public static class ScenarioEndpoints
{
    public const int MaxScenarios = 3;
    private const decimal MaxRate = 20m;

    public static RouteGroupBuilder MapScenarioEndpoints(this RouteGroupBuilder api)
    {
        var scenarios = api.MapGroup("/scenarios").WithTags("Scenarios").RequireAuthorization();

        scenarios.MapGet("", GetScenarios);
        scenarios.MapPost("", AddScenario).RequireFullAccess();
        scenarios.MapPut("/{id:guid}", ReplaceScenario).RequireFullAccess();
        scenarios.MapDelete("/{id:guid}", DeleteScenario).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetScenarios(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var scenarios = await db.Scenarios.AsNoTracking().Where(s => s.UserId == userId).OrderBy(s => s.SortOrder).ToListAsync(ct);
        return Results.Ok(scenarios.Select(ScenarioResponse.From).ToList());
    }

    private static async Task<IResult> AddScenario(SaveScenarioRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var existing = await db.Scenarios.Where(s => s.UserId == userId).Select(s => (int?)s.SortOrder).ToListAsync(ct);
        if (existing.Count >= MaxScenarios)
        {
            var full = new Validation();
            full.Add("name", $"You can keep up to {MaxScenarios} scenarios. Delete one to make room.");
            return full.ToResult();
        }

        var (name, overrides, check) = await Validate(request, userId, db, ct);
        if (check.Failed)
            return check.ToResult();

        var now = clock.GetUtcNow();
        var scenario = new Scenario
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            SortOrder = (existing.Max() ?? -1) + 1,
            OverridesJson = ScenarioJson.Write(overrides),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Scenarios.Add(scenario);
        await db.SaveChangesAsync(ct);
        return Results.Ok(ScenarioResponse.From(scenario));
    }

    private static async Task<IResult> ReplaceScenario(Guid id, SaveScenarioRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var scenario = await db.Scenarios.SingleOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (scenario is null)
            return ScenarioMissing();

        var (name, overrides, check) = await Validate(request, userId, db, ct);
        if (check.Failed)
            return check.ToResult();

        scenario.Name = name;
        scenario.OverridesJson = ScenarioJson.Write(overrides);
        scenario.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.Ok(ScenarioResponse.From(scenario));
    }

    private static async Task<IResult> DeleteScenario(Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var scenario = await db.Scenarios.SingleOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (scenario is null)
            return ScenarioMissing();

        db.Scenarios.Remove(scenario);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    /// <summary>Checks a request and returns the cleaned name and overrides, with enum names in their canonical form.</summary>
    private static async Task<(string Name, ScenarioOverrides Overrides, Validation Check)> Validate(
        SaveScenarioRequest request, Guid userId, AppDbContext db, CancellationToken ct)
    {
        var check = new Validation();
        var name = check.Name("name", request.Name);
        var o = request.Overrides ?? new ScenarioOverrides(null, null, null, null, null, null);

        decimal? income = o.MonthlyIncome is null ? null : check.Amount("monthlyIncome", o.MonthlyIncome, "an income");
        decimal? raise = o.IncomeGrowthRate is null ? null : check.Percent("incomeGrowthRate", o.IncomeGrowthRate, "a yearly raise", MaxRate);

        Dictionary<Guid, decimal>? amounts = null;
        if (o.CategoryAmounts is { Count: > 0 })
        {
            // Only this user's own categories may be named; anything else is a stale or hand-made request.
            var mine = (await db.Categories.AsNoTracking().Where(c => c.UserId == userId).Select(c => c.Id).ToListAsync(ct)).ToHashSet();
            amounts = [];
            foreach (var (categoryId, amount) in o.CategoryAmounts)
            {
                if (!mine.Contains(categoryId))
                    check.Add("categoryAmounts", "That plan has changed. Refresh and try again.");
                else if (amount < 0 || amount > Validation.MaxAmount)
                    check.Add("categoryAmounts", "Enter amounts between $0 and $999,999,999.");
                else
                    amounts[categoryId] = amount;
            }
        }

        string? strategy = o.DebtStrategy is null ? null : check.Enum<DebtStrategy>("debtStrategy", o.DebtStrategy, "Pick snowball, avalanche or custom.").ToString();
        string? debtDone = o.DebtDoneDestination is null ? null : check.Enum<FreedMoneyDestination>("debtDoneDestination", o.DebtDoneDestination, "Pick where the debt money goes next.").ToString();
        string? savingsDone = o.SavingsDoneDestination is null ? null : check.Enum<FreedMoneyDestination>("savingsDoneDestination", o.SavingsDoneDestination, "Pick where the savings money goes next.").ToString();

        // Money can't be sent back to the job it has just finished.
        if (debtDone == nameof(FreedMoneyDestination.Debt))
            check.Add("debtDoneDestination", "Pick investments, savings or remaining.");
        if (savingsDone == nameof(FreedMoneyDestination.Savings))
            check.Add("savingsDoneDestination", "Pick investments, debt or remaining.");

        return (name, new ScenarioOverrides(income, amounts, raise, strategy, debtDone, savingsDone), check);
    }

    private static IResult ScenarioMissing() =>
        Results.Problem(title: "That scenario no longer exists.", statusCode: StatusCodes.Status404NotFound);
}
