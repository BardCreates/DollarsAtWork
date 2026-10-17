using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Savings;

/// <summary>Used to add a goal and to replace one. TargetDate and Apy are optional.</summary>
public record SaveGoalRequest(string? Name, decimal? TargetAmount, decimal? CurrentBalance, DateOnly? TargetDate, decimal? Apy, decimal? SharePercent);

/// <summary>Every goal id, in the new priority order.</summary>
public record ReorderGoalsRequest(Guid[]? Ids);

public record SetSplitModeRequest(string? SplitMode);

public record GoalResponse(Guid Id, string Name, decimal TargetAmount, decimal CurrentBalance, DateOnly? TargetDate, decimal Apy, int Priority, decimal SharePercent)
{
    public static GoalResponse From(SavingsGoal g) =>
        new(g.Id, g.Name, g.TargetAmount, g.CurrentBalance, g.TargetDate, g.Apy, g.Priority, g.SharePercent);
}

/// <summary>
/// MonthlyAmount is read from the plan's built-in Savings category; it is never stored here.
/// PlannedExpenses is the plan's custom categories plus every open debt's minimum payment, used to size an emergency fund.
/// </summary>
public record SavingsResponse(string SplitMode, decimal MonthlyAmount, decimal PlannedExpenses, IReadOnlyList<GoalResponse> Goals);
