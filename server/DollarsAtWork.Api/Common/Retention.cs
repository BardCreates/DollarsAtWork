using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Deletes records the app only needs for a while, so tables that grow on every visit or webhook stay small.
/// Run hourly by TrialEmailWorker; each pass deletes only what has aged out since the last one. The Privacy Policy
/// states the usage-count period; change both together.
/// </summary>
public class RetentionService(AppDbContext db, TimeProvider clock, ILogger<RetentionService> logger)
{
    /// <summary>Anonymous usage counts: 13 months, enough to compare a month with the same month last year.</summary>
    public static readonly TimeSpan UsageEventsKept = TimeSpan.FromDays(400);

    /// <summary>Stripe webhook ids kept to ignore repeats. Stripe stops retrying an event after 3 days; 90 is generous.</summary>
    public static readonly TimeSpan StripeEventsKept = TimeSpan.FromDays(90);

    public async Task<int> DeleteExpiredAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var usageCutoff = now - UsageEventsKept;
        var stripeCutoff = now - StripeEventsKept;

        var usage = await db.UsageEvents.Where(e => e.At < usageCutoff).ExecuteDeleteAsync(ct);
        var stripe = await db.ProcessedStripeEvents.Where(e => e.ReceivedAt < stripeCutoff).ExecuteDeleteAsync(ct);

        if (usage + stripe > 0)
            logger.LogInformation("Retention: deleted {Usage} usage events and {Stripe} Stripe event ids", usage, stripe);
        return usage + stripe;
    }
}
