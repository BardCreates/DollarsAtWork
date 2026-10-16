namespace DollarsAtWork.Api.Features.Usage;

/// <summary>Source: the page's ?from tag, when it has one (see SignupSources). Optional.</summary>
public record RecordUsageRequest(string? Name, string? Source = null);

/// <summary>How many times an event happened in the last `days` days, and in the `days` days before that.</summary>
public record UsageCount(string Name, int ThisPeriod, int PreviousPeriod);

/// <summary>Sign-ups in the current window, by the page that sent them. Null source = unknown.</summary>
public record SourceCount(string? Source, int Count);

public record UsageSummaryResponse(int Days, DateTimeOffset From, DateTimeOffset To, IReadOnlyList<UsageCount> Events, IReadOnlyList<SourceCount> SignupSources);
