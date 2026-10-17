using System.Security.Claims;
using System.Text.RegularExpressions;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Plan;

public static partial class PlanEndpoints
{
    public const decimal MaxAmount = 999_999_999.99m;
    public const int MaxCategories = 100;
    private const int MaxNameLength = 60;
    private const string DefaultColor = "#94a3b8";

    public static RouteGroupBuilder MapPlanEndpoints(this RouteGroupBuilder api)
    {
        var plan = api.MapGroup("/plan").WithTags("Plan").RequireAuthorization();

        plan.MapGet("", GetPlan);
        plan.MapPut("/income", UpdateIncome).RequireFullAccess();
        plan.MapPost("/scale", ScaleCategories).RequireFullAccess();
        plan.MapPost("/categories", AddCategory).RequireFullAccess();
        plan.MapPut("/categories/order", ReorderCategories).RequireFullAccess();
        plan.MapPatch("/categories/{id:guid}", UpdateCategory).RequireFullAccess();
        plan.MapDelete("/categories/{id:guid}", DeleteCategory).RequireFullAccess();

        return api;
    }

    private static async Task<IResult> GetPlan(ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        var categories = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.SortOrder)
            .ToListAsync(ct);

        return Results.Ok(ToResponse(plan, categories));
    }

    /// <summary>Changes income only. Category dollar amounts stay as they are, so Remaining moves.</summary>
    private static async Task<IResult> UpdateIncome(
        UpdateIncomeRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        if (request.MonthlyIncome is not { } income || !IsValidAmount(income))
            return Invalid("monthlyIncome", "Enter an income between $0 and $999,999,999.");

        var userId = principal.GetUserId();
        var plan = await db.Plans.SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();
        // With income sources, the income is their total; a typed number would be overwritten by the next change.
        if (await db.IncomeSources.AnyAsync(s => s.UserId == userId, ct))
            return Invalid("monthlyIncome", "Your income adds up from your income sources. Change those instead.");

        plan.MonthlyIncome = income;
        plan.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToResponse(plan, await LoadCategories(db, userId, ct)));
    }

    private static async Task<IResult> ScaleCategories(
        ScaleCategoriesRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        if (request.FromIncome is not { } fromIncome || fromIncome <= 0 || fromIncome > MaxAmount)
            return Invalid("fromIncome", "Scaling needs the previous income, and it must be above $0.");

        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        var categories = await LoadCategories(db, userId, ct);
        var factor = plan.MonthlyIncome / fromIncome;
        var now = clock.GetUtcNow();
        foreach (var category in categories)
        {
            var scaled = Math.Round(category.Amount * factor, 2, MidpointRounding.AwayFromZero);
            category.Amount = Math.Min(scaled, MaxAmount);
            category.UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToResponse(plan, categories));
    }

    private static async Task<IResult> AddCategory(
        AddCategoryRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = ValidateName(request.Name, errors);
        var amount = request.Amount ?? 0m;
        if (!IsValidAmount(amount))
            errors["amount"] = ["Enter an amount between $0 and $999,999,999."];
        var color = request.Color ?? DefaultColor;
        if (!ColorPattern().IsMatch(color))
            errors["color"] = ["Pick a color from the list."];
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var userId = principal.GetUserId();
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, ct);
        if (plan is null)
            return PlanMissing();

        var categories = await LoadCategories(db, userId, ct);
        if (categories.Count >= MaxCategories)
            return Invalid("name", $"A plan can have up to {MaxCategories} categories.");

        var now = clock.GetUtcNow();
        var category = new Category
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Kind = CategoryKind.Custom,
            Name = name!,
            Amount = amount,
            Color = color,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Categories.Add(category);

        categories.Insert(Math.Clamp(request.Position ?? categories.Count, 0, categories.Count), category);
        Renumber(categories);
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToResponse(plan, categories));
    }

    private static async Task<IResult> UpdateCategory(
        Guid id,
        UpdateCategoryRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var category = await db.Categories.SingleOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
        if (category is null)
            return CategoryMissing();

        var errors = new Dictionary<string, string[]>();
        if (request.Name is not null)
        {
            var name = ValidateName(request.Name, errors);
            if (category.IsBuiltIn && name is not null && name != category.Name)
                errors["name"] = [$"{category.Name} is built in and can't be renamed."];
            else if (name is not null)
                category.Name = name;
        }
        if (request.Amount is { } amount)
        {
            if (IsValidAmount(amount)) category.Amount = amount;
            else errors["amount"] = ["Enter an amount between $0 and $999,999,999."];
        }
        if (request.Color is { } color)
        {
            if (ColorPattern().IsMatch(color)) category.Color = color;
            else errors["color"] = ["Pick a color from the list."];
        }
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        category.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return Results.Ok(CategoryResponse.From(category));
    }

    private static async Task<IResult> DeleteCategory(Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var category = await db.Categories.SingleOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
        if (category is null)
            return CategoryMissing();

        if (category.IsBuiltIn)
            return Results.Problem(
                title: $"{category.Name} is built in and can't be deleted.",
                detail: "Set its amount to $0 if you don't want to use it.",
                statusCode: StatusCodes.Status409Conflict);

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderCategories(
        ReorderCategoriesRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var categories = await LoadCategories(db, userId, ct);
        var ids = request.Ids ?? [];

        // The list must be exactly this plan's categories, each once.
        if (ids.Length != categories.Count || !ids.ToHashSet().SetEquals(categories.Select(c => c.Id)))
            return Invalid("ids", "The category list is out of date. Refresh and try again.");

        var byId = categories.ToDictionary(c => c.Id);
        for (var i = 0; i < ids.Length; i++)
            byId[ids[i]].SortOrder = i;
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }

    private static Task<List<Category>> LoadCategories(AppDbContext db, Guid userId, CancellationToken ct) =>
        db.Categories.Where(c => c.UserId == userId).OrderBy(c => c.SortOrder).ToListAsync(ct);

    private static void Renumber(List<Category> categories)
    {
        for (var i = 0; i < categories.Count; i++)
            categories[i].SortOrder = i;
    }

    private static PlanResponse ToResponse(Domain.Plan plan, IEnumerable<Category> categories) =>
        new(plan.MonthlyIncome, plan.Currency, categories.Select(CategoryResponse.From).ToList());

    private static bool IsValidAmount(decimal amount) => amount is >= 0 and <= MaxAmount;

    /// <summary>Returns the trimmed name, or null after recording why it isn't valid.</summary>
    private static string? ValidateName(string? name, Dictionary<string, string[]> errors)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            errors["name"] = ["Give the category a name."];
            return null;
        }
        if (trimmed.Length > MaxNameLength)
        {
            errors["name"] = [$"Keep the name to {MaxNameLength} characters or fewer."];
            return null;
        }
        return trimmed;
    }

    private static IResult Invalid(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });

    private static IResult PlanMissing() =>
        Results.Problem(title: "We couldn't find your plan.", statusCode: StatusCodes.Status404NotFound);

    private static IResult CategoryMissing() =>
        Results.Problem(title: "That category no longer exists.", statusCode: StatusCodes.Status404NotFound);

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex ColorPattern();
}
