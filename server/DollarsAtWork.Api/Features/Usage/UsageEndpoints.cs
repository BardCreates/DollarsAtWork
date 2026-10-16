using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Usage;

/// <summary>
/// Anonymous usage counts. The browser sends page visits and calculator use (no account needed, no cookie read);
/// the server records sign-ups, trials and subscriptions itself. Only the owner can read the totals.
/// </summary>
public static class UsageEndpoints
{
    private const int MaxDays = 365;

    public static RouteGroupBuilder MapUsageEndpoints(this RouteGroupBuilder api)
    {
        var usage = api.MapGroup("/usage").WithTags("Usage");

        usage.MapPost("/", Record).AllowAnonymous().RequireRateLimiting(RateLimits.Usage);
        usage.MapGet("/summary", Summary).RequireAuthorization().RequireOwner();

        return api;
    }

    private static async Task<IResult> Record(RecordUsageRequest request, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var name = request.Name?.Trim() ?? "";
        if (!UsageEvents.FromBrowser.Contains(name))
        {
            var check = new Validation();
            check.Add("name", "That isn't something we count.");
            return check.ToResult();
        }

        UsageEvents.Record(db, clock, name, request.Source);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Summary(int? days, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var window = days ?? 7;
        if (window < 1 || window > MaxDays)
        {
            var check = new Validation();
            check.Add("days", $"Choose between 1 and {MaxDays} days.");
            return check.ToResult();
        }

        var to = clock.GetUtcNow();
        var from = to.AddDays(-window);
        var previousFrom = from.AddDays(-window);

        var current = await CountByNameAsync(db, from, to, ct);
        var previous = await CountByNameAsync(db, previousFrom, from, ct);

        var events = UsageEvents.All
            .Select(name => new UsageCount(name, current.GetValueOrDefault(name), previous.GetValueOrDefault(name)))
            .ToList();

        var sources = await db.UsageEvents.AsNoTracking()
            .Where(u => u.Name == UsageEvents.Signup && u.At >= from && u.At < to)
            .GroupBy(u => u.Source)
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var signupSources = sources
            .OrderByDescending(s => s.Count)
            .ThenBy(s => s.Source)
            .Select(s => new SourceCount(s.Source, s.Count))
            .ToList();

        return Results.Ok(new UsageSummaryResponse(window, from, to, events, signupSources));
    }

    private static async Task<Dictionary<string, int>> CountByNameAsync(AppDbContext db, DateTimeOffset from, DateTimeOffset to, CancellationToken ct)
    {
        var rows = await db.UsageEvents.AsNoTracking()
            .Where(u => u.At >= from && u.At < to)
            .GroupBy(u => u.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Name, r => r.Count);
    }
}
