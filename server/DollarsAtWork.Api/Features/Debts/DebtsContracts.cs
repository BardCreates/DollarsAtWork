using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Debts;

/// <summary>
/// PromoEndsMonth ("YYYY-MM", the last month at PromoApr) adds a promotional rate; PromoApr defaults to 0.
/// </summary>
public record AddDebtRequest(
    string? Name,
    string? Type,
    decimal? Balance,
    decimal? Apr,
    decimal? MinPayment,
    bool? MinimumOnly,
    decimal? PromoApr = null,
    string? PromoEndsMonth = null);

/// <summary>
/// Only the fields that are present are changed. PromoEndsMonth "" removes the promotion; a month sets it, with
/// PromoApr (default 0).
/// </summary>
public record UpdateDebtRequest(
    string? Name,
    string? Type,
    decimal? Balance,
    decimal? Apr,
    decimal? MinPayment,
    bool? MinimumOnly,
    decimal? PromoApr = null,
    string? PromoEndsMonth = null);

/// <summary>Every debt id, in the new order. This is the payoff order for the Custom strategy.</summary>
public record ReorderDebtsRequest(Guid[]? Ids);

public record SetDebtStrategyRequest(string? Strategy);

/// <summary>PromoEndsMonth is "YYYY-MM" or null.</summary>
public record DebtResponse(
    Guid Id,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal MinPayment,
    bool MinimumOnly,
    decimal? PromoApr,
    string? PromoEndsMonth,
    int SortOrder)
{
    public static DebtResponse From(Debt d) =>
        new(d.Id, d.Name, d.Type.ToString(), d.Balance, d.Apr, d.MinPayment, d.MinimumOnly, d.PromoApr, d.PromoEndsMonth?.ToString("yyyy-MM"), d.SortOrder);
}

/// <summary>MonthlyBudget is read from the plan's built-in Debt category; it is never stored here.</summary>
public record DebtsResponse(string Strategy, decimal MonthlyBudget, IReadOnlyList<DebtResponse> Debts);
