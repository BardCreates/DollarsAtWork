using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.NetWorth;

/// <summary>Used to add an item and to replace one.</summary>
public record SaveOtherItemRequest(string? Name, string? Kind, string? Type, decimal? Value);

public record SaveSettingsRequest(string? DebtDoneDestination, string? SavingsDoneDestination, decimal? InflationRate, decimal? IncomeGrowthRate);

public record BalanceUpdate(Guid Id, decimal? Balance);

/// <summary>
/// The monthly check-in: the balances the user has just confirmed. Anything left out keeps its balance.
/// Saving it also records this month's net-worth snapshot.
/// </summary>
public record CheckInRequest(BalanceUpdate[]? Goals, BalanceUpdate[]? Debts, BalanceUpdate[]? Accounts, BalanceUpdate[]? Items);

public record OtherItemResponse(Guid Id, string Name, string Kind, string Type, decimal Value, int SortOrder)
{
    public static OtherItemResponse From(OtherItem i) => new(i.Id, i.Name, i.Kind.ToString(), i.Type.ToString(), i.Value, i.SortOrder);
}

public record SnapshotResponse(DateOnly Date, decimal Assets, decimal Liabilities, decimal NetWorth)
{
    public static SnapshotResponse From(NetWorthSnapshot s) => new(s.Date, s.Assets, s.Liabilities, s.NetWorth);
}

public record SettingsResponse(string DebtDoneDestination, string SavingsDoneDestination, decimal InflationRate, decimal IncomeGrowthRate)
{
    public static SettingsResponse From(Domain.Plan p) =>
        new(p.DebtDoneDestination.ToString(), p.SavingsDoneDestination.ToString(), p.InflationRate, p.IncomeGrowthRate);
}

public record NetWorthResponse(SettingsResponse Settings, IReadOnlyList<OtherItemResponse> Items, IReadOnlyList<SnapshotResponse> Snapshots);
