using System.Globalization;
using System.Text;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// The plain-text onboarding emails for a trial's first days. Each is sent at most once per account,
/// recorded on AppUser (WelcomeEmailSentAt, NudgeEmailSentAt).
/// </summary>
public static class OnboardingEmails
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    /// <summary>How long after sign-up a welcome of either kind can still go out.</summary>
    public static readonly TimeSpan WelcomeWindow = TimeSpan.FromDays(3);

    private const string ReplyLine = "Reply to this email if anything is confusing — a person reads it.";
    private const string TrialLine = "Your 30-day trial is free and we didn't ask for a card.";
    private const string EstimatesLine = "Estimates based on your plan and assumed returns, not financial advice.";

    private static string Money(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero).ToString("$#,##0;-$#,##0", Invariant);

    /// <summary>
    /// The hour-1 welcome, with the person's own numbers worked out by the browser. Lines whose number is missing are left out.
    /// </summary>
    public static (string Subject, string Body) Welcome(int? debtFreeMonth, decimal? netWorthIn10Years, DateTimeOffset now, string appUrl)
    {
        var body = new StringBuilder();
        body.AppendLine("Your plan is set up and your dollars have clocked in.");
        body.AppendLine();

        var ahead = new List<string>();
        if (netWorthIn10Years is { } ten)
            ahead.Add($"  Net worth in 10 years: about {Money(ten)}");
        if (debtFreeMonth is { } months and > 0)
            ahead.Add($"  Debt-free: {DateOnly.FromDateTime(now.UtcDateTime.AddMonths(months)).ToString("MMMM yyyy", Invariant)}");
        if (ahead.Count > 0)
        {
            body.AppendLine("Where you're headed:");
            foreach (var line in ahead) body.AppendLine(line);
            body.AppendLine();
        }

        body.AppendLine($"Move a dollar from one category to another on the Plan page and those numbers change in front of you: {appUrl}/plan");
        body.AppendLine();
        body.AppendLine(TrialLine);
        body.AppendLine();
        body.AppendLine(ReplyLine);
        body.AppendLine();
        body.AppendLine(EstimatesLine);
        return ("Your dollars clocked in", body.ToString());
    }

    /// <summary>For someone who signed up but never reached the dashboard, an hour or more later.</summary>
    public static (string Subject, string Body) PlanWaiting(string appUrl)
    {
        var body = new StringBuilder();
        body.AppendLine("You signed up for Dollars at Work but haven't built a plan yet.");
        body.AppendLine();
        body.AppendLine($"It takes about three minutes: your monthly income, a few categories, and you'll see where you're headed. Start here: {appUrl}/welcome");
        body.AppendLine();
        body.AppendLine(ReplyLine);
        return ("Your plan is waiting", body.ToString());
    }

    /// <summary>The day-3 nudge: try one what-if scenario.</summary>
    public static (string Subject, string Body) Nudge(string appUrl)
    {
        var body = new StringBuilder();
        body.AppendLine("Pick one question. Pay an extra $100 toward debt? A raise next year? A house in 2029?");
        body.AppendLine();
        body.AppendLine($"Save it as a scenario and compare it with your real plan on one chart. Your real plan doesn't change: {appUrl}/what-if");
        body.AppendLine();
        body.AppendLine(TrialLine);
        body.AppendLine();
        body.AppendLine(ReplyLine);
        body.AppendLine();
        body.AppendLine(EstimatesLine);
        return ("Try one what-if", body.ToString());
    }
}

/// <summary>
/// The hourly onboarding passes: a fallback welcome for people who signed up but never reached the dashboard,
/// and the day-3 what-if nudge for people still on the trial. Both are idempotent through the columns on AppUser.
/// </summary>
public class OnboardingEmailService(AppDbContext db, IAppEmailSender sender, IOptions<AppOptions> options, TimeProvider clock, ILogger<OnboardingEmailService> logger)
{
    private string BaseUrl => options.Value.PublicUrl.TrimEnd('/');

    public async Task<int> SendDueAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var sent = await SendPlanWaitingAsync(now, ct) + await SendNudgesAsync(now, ct);
        if (sent > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Sent {Count} onboarding emails", sent);
        }
        return sent;
    }

    /// <summary>Signed up more than an hour ago, less than three days ago, and no welcome of either kind yet.</summary>
    private async Task<int> SendPlanWaitingAsync(DateTimeOffset now, CancellationToken ct)
    {
        var oldest = now - OnboardingEmails.WelcomeWindow;
        var newest = now.AddHours(-1);
        var due = await db.Users
            .Where(u => u.EmailConfirmed && u.WelcomeEmailSentAt == null && u.CreatedAt > oldest && u.CreatedAt <= newest)
            .ToListAsync(ct);

        var (subject, body) = OnboardingEmails.PlanWaiting(BaseUrl);
        var sent = 0;
        foreach (var user in due)
        {
            if (user.Email is null) continue;
            await sender.SendAsync(user.Email, subject, body, ct);
            user.WelcomeEmailSentAt = now;
            sent++;
        }
        return sent;
    }

    /// <summary>Three to ten days in, still on the free trial, and not nudged yet.</summary>
    private async Task<int> SendNudgesAsync(DateTimeOffset now, CancellationToken ct)
    {
        var oldest = now.AddDays(-10);
        var newest = now.AddDays(-3);
        var due = await (
            from user in db.Users
            join subscription in db.Subscriptions on user.Id equals subscription.UserId
            where user.EmailConfirmed
                && user.NudgeEmailSentAt == null
                && user.CreatedAt > oldest
                && user.CreatedAt <= newest
                && subscription.Status == SubscriptionStatus.Trialing
            select user).ToListAsync(ct);

        var (subject, body) = OnboardingEmails.Nudge(BaseUrl);
        var sent = 0;
        foreach (var user in due)
        {
            if (user.Email is null) continue;
            await sender.SendAsync(user.Email, subject, body, ct);
            user.NudgeEmailSentAt = now;
            sent++;
        }
        return sent;
    }
}
