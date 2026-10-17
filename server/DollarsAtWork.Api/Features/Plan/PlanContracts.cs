using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Plan;

public record UpdateIncomeRequest(decimal? MonthlyIncome);

/// <summary>Rescales every category by (current income ÷ FromIncome), after the income itself has been changed.</summary>
public record ScaleCategoriesRequest(decimal? FromIncome);

/// <summary>Position is the row index to insert at; omitted means the end of the list.</summary>
public record AddCategoryRequest(string? Name, decimal? Amount, string? Color, int? Position);

/// <summary>Only the fields that are present are changed.</summary>
public record UpdateCategoryRequest(string? Name, decimal? Amount, string? Color);

/// <summary>Every category id of the plan, in the new order.</summary>
public record ReorderCategoriesRequest(Guid[]? Ids);

public record CategoryResponse(Guid Id, string Name, string Kind, decimal Amount, int SortOrder, string Color, bool IsBuiltIn)
{
    public static CategoryResponse From(Category c) =>
        new(c.Id, c.Name, c.Kind.ToString(), c.Amount, c.SortOrder, c.Color, c.IsBuiltIn);
}

public record PlanResponse(decimal MonthlyIncome, string Currency, IReadOnlyList<CategoryResponse> Categories);

/// <summary>Used to add an income source and to replace one.</summary>
public record SaveIncomeSourceRequest(string? Name, decimal? Amount, string? Frequency);

public record IncomeSourceResponse(Guid Id, string Name, decimal Amount, string Frequency, decimal MonthlyAmount, int SortOrder)
{
    public static IncomeSourceResponse From(IncomeSource i) =>
        new(i.Id, i.Name, i.Amount, i.Frequency.ToString(), Math.Round(i.MonthlyAmount, 2, MidpointRounding.AwayFromZero), i.SortOrder);
}

/// <summary>The plan's income and the sources it adds up from (empty when it's one number typed on Plan).</summary>
public record IncomesResponse(decimal MonthlyIncome, IReadOnlyList<IncomeSourceResponse> Sources);
