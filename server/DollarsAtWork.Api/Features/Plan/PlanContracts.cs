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
