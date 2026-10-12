using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Investments;

/// <summary>
/// Used to add an account and to replace one. ExpectedReturn defaults to 7.
/// Match fields are optional: MatchPercent of each contribution, on contributions up to MatchLimitPercent of income.
/// Shares are changed together through the split endpoint, never here.
/// </summary>
public record SaveAccountRequest(string? Name, string? Type, decimal? Balance, decimal? ExpectedReturn, decimal? MatchPercent, decimal? MatchLimitPercent);

public record AccountShare(Guid Id, decimal? SharePercent);

/// <summary>A share for every account; together they must total 100.</summary>
public record SetSplitRequest(AccountShare[]? Shares);

public record AccountResponse(
    Guid Id,
    string Name,
    string Type,
    decimal Balance,
    decimal ExpectedReturn,
    decimal SharePercent,
    decimal? MatchPercent,
    decimal? MatchLimitPercent,
    int SortOrder)
{
    public static AccountResponse From(InvestmentAccount a) =>
        new(a.Id, a.Name, a.Type.ToString(), a.Balance, a.ExpectedReturn, a.SharePercent, a.MatchPercent, a.MatchLimitPercent, a.SortOrder);
}

/// <summary>
/// MonthlyAmount is read from the plan's built-in Investments category; it is never stored here.
/// MonthlyIncome is the plan's income, which the employer-match cap is a percent of.
/// </summary>
public record InvestmentsResponse(decimal MonthlyAmount, decimal MonthlyIncome, IReadOnlyList<AccountResponse> Accounts);
