using System.Text.Json;
using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Scenarios;

/// <summary>
/// What a scenario changes about the real plan. Anything left out follows the real plan as it is today,
/// so an unchanged category keeps tracking the plan when the plan changes.
/// </summary>
public record ScenarioOverrides(
    decimal? MonthlyIncome,
    Dictionary<Guid, decimal>? CategoryAmounts,
    decimal? IncomeGrowthRate,
    string? DebtStrategy,
    string? DebtDoneDestination,
    string? SavingsDoneDestination);

public record SaveScenarioRequest(string? Name, ScenarioOverrides? Overrides);

public record ScenarioResponse(Guid Id, string Name, int SortOrder, ScenarioOverrides Overrides)
{
    public static ScenarioResponse From(Scenario s) => new(s.Id, s.Name, s.SortOrder, ScenarioJson.Read(s.OverridesJson));
}

/// <summary>The overrides are kept as one JSON column: the set of things a scenario can change will grow.</summary>
public static class ScenarioJson
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string Write(ScenarioOverrides overrides) => JsonSerializer.Serialize(overrides, Options);

    public static ScenarioOverrides Read(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<ScenarioOverrides>(json, Options) ?? Empty;
        }
        catch (JsonException)
        {
            // A damaged value should never take the page down: treat it as "no changes".
            return Empty;
        }
    }

    private static readonly ScenarioOverrides Empty = new(null, null, null, null, null, null);
}
