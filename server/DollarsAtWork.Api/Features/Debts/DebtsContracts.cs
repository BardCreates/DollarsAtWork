using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Debts;

public record AddDebtRequest(string? Name, string? Type, decimal? Balance, decimal? Apr, decimal? MinPayment, bool? MinimumOnly);

/// <summary>Only the fields that are present are changed.</summary>
public record UpdateDebtRequest(string? Name, string? Type, decimal? Balance, decimal? Apr, decimal? MinPayment, bool? MinimumOnly);

/// <summary>Every debt id, in the new order. This is the payoff order for the Custom strategy.</summary>
public record ReorderDebtsRequest(Guid[]? Ids);

public record SetDebtStrategyRequest(string? Strategy);

public record DebtResponse(Guid Id, string Name, string Type, decimal Balance, decimal Apr, decimal MinPayment, bool MinimumOnly, int SortOrder)
{
    public static DebtResponse From(Debt d) => new(d.Id, d.Name, d.Type.ToString(), d.Balance, d.Apr, d.MinPayment, d.MinimumOnly, d.SortOrder);
}

/// <summary>MonthlyBudget is read from the plan's built-in Debt category; it is never stored here.</summary>
public record DebtsResponse(string Strategy, decimal MonthlyBudget, IReadOnlyList<DebtResponse> Debts);
