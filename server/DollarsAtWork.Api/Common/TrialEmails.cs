using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Sends the three trial emails: 7 days left (day 23), 2 days left (day 28) and trial ended.
/// Each account gets each email at most once; an account that was missed gets only the latest one.
/// </summary>
public class TrialEmailService(AppDbContext db, IAppEmailSender sender, IOptions<AppOptions> options, TimeProvider clock, ILogger<TrialEmailService> logger)
{
    public static TrialEmailStage StageFor(DateTimeOffset trialEndsAt, DateTimeOffset now)
    {
        if (now >= trialEndsAt) return TrialEmailStage.Ended;
        var daysLeft = (trialEndsAt - now).TotalDays;
        if (daysLeft <= 2) return TrialEmailStage.TwoDaysLeft;
        if (daysLeft <= 7) return TrialEmailStage.SevenDaysLeft;
        return TrialEmailStage.None;
    }

    public async Task<int> SendDueAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var soon = now.AddDays(7);

        // Only accounts still on the free trial: anyone who has subscribed is Stripe's to email.
        var due = await (
            from subscription in db.Subscriptions
            join user in db.Users on subscription.UserId equals user.Id
            where subscription.Status == SubscriptionStatus.Trialing
                && subscription.TrialEmailStage != TrialEmailStage.Ended
                && subscription.TrialEndsAt <= soon
            select new { subscription, user.Email }).ToListAsync(ct);

        var sent = 0;
        foreach (var row in due)
        {
            var stage = StageFor(row.subscription.TrialEndsAt, now);
            if (stage <= row.subscription.TrialEmailStage || row.Email is null)
                continue;

            var (subject, body) = Compose(stage, row.subscription.TrialEndsAt);
            await sender.SendAsync(row.Email, subject, body, ct);
            row.subscription.TrialEmailStage = stage;
            row.subscription.UpdatedAt = now;
            sent++;
        }

        if (sent > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Sent {Count} trial emails", sent);
        }
        return sent;
    }

    private (string Subject, string Body) Compose(TrialEmailStage stage, DateTimeOffset trialEndsAt)
    {
        var link = $"{options.Value.PublicUrl.TrimEnd('/')}/profile";
        var ends = trialEndsAt.ToString("MMMM d");
        return stage switch
        {
            TrialEmailStage.SevenDaysLeft => (
                "7 days left in your Dollars at Work trial",
                $"Your free trial ends on {ends}. Subscribe any time to keep editing your plan:\n{link}"),
            TrialEmailStage.TwoDaysLeft => (
                "2 days left in your Dollars at Work trial",
                $"Your free trial ends on {ends}. Subscribe now so nothing changes:\n{link}"),
            _ => (
                "Your Dollars at Work trial has ended",
                $"Your plan and all your numbers are safe and you can still see them, but editing is turned off. Subscribe to pick up where you left off:\n{link}"),
        };
    }
}

/// <summary>Runs the trial emails shortly after start-up and then once an hour.</summary>
public class TrialEmailWorker(IServiceScopeFactory scopes, TimeProvider clock, ILogger<TrialEmailWorker> logger) : BackgroundService
{
    private static readonly TimeSpan FirstRun = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(FirstRun, clock, stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<TrialEmailService>().SendDueAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // A failed run must not stop the next one.
                    logger.LogError(ex, "Sending trial emails failed");
                }
                await Task.Delay(Interval, clock, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down.
        }
    }
}
