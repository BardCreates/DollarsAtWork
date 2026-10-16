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

            var message = Compose(stage, row.subscription.TrialEndsAt, options.Value.PublicUrl);
            await sender.SendAsync(row.Email, message, ct);
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

    public static EmailMessage Compose(TrialEmailStage stage, DateTimeOffset trialEndsAt, string appUrl)
    {
        var baseUrl = appUrl.TrimEnd('/');
        var link = $"{baseUrl}/profile";
        // A moment with a time and a named zone, never a bare UTC day: a 9 pm Central sign-up must not be told the next day.
        var ends = EmailDates.Moment(trialEndsAt);
        var layout = new EmailLayout(baseUrl)
            .FooterNote("You're getting this because your Dollars at Work free trial is ending.");
        return stage switch
        {
            TrialEmailStage.SevenDaysLeft => layout
                .Preheader($"Your trial ends on {ends}. Keep your plan moving.")
                .Heading("One week left in your free trial")
                .Paragraph($"Your free trial ends on {ends}. We hope your plan is already showing you where your money can go.")
                .Paragraph("Subscribe before then and everything keeps working: your plan, your money timeline, what-if scenarios and monthly check-ins.")
                .Button("Choose a plan", link)
                .Small("Not ready yet? That's okay. Your numbers stay safe either way.")
                .Build("7 days left in your Dollars at Work trial"),
            TrialEmailStage.TwoDaysLeft => layout
                .Preheader($"Your plan becomes view-only on {ends}.")
                .Heading("Your trial ends in 2 days")
                .Paragraph($"Your plan switches to view-only on {ends}. You'll still see every number, but you won't be able to change them.")
                .Paragraph("Subscribe now and nothing changes. Keep moving dollars, checking in and trying what-ifs.")
                .Button("Keep my plan going", link)
                .Build("2 days left in your Dollars at Work trial"),
            _ => layout
                .Preheader("Your numbers are safe. Pick up where you left off any time.")
                .Heading("Your free trial has ended")
                .Paragraph("Your plan and every number in it are safe, and you can still see them. Editing is paused for now.")
                .Paragraph("Whenever you're ready, subscribe to pick up right where you left off. Nothing to rebuild.")
                .Button("Pick up where I left off", link)
                .Build("Your Dollars at Work trial has ended"),
        };
    }
}

/// <summary>
/// Runs the trial and onboarding emails, the lapsing-subscription re-sync and the retention clean-up shortly after
/// start-up, then hourly. Each in its own try, so one failing never holds up the others.
/// </summary>
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
                    await scope.ServiceProvider.GetRequiredService<OnboardingEmailService>().SendDueAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // A failed run must not stop the next one.
                    logger.LogError(ex, "Sending trial emails failed");
                }
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<DollarsAtWork.Api.Features.Billing.BillingService>().SyncLapsingAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Re-syncing lapsing subscriptions failed");
                }
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<RetentionService>().DeleteExpiredAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // Separate from the emails, so a clean-up failure never holds them up (or the other way round).
                    logger.LogError(ex, "Retention clean-up failed");
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
