using System.Globalization;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// The onboarding emails for a trial's first days, in the branded layout (EmailLayout). Each is sent at most once per
/// account, recorded on AppUser (WelcomeEmailSentAt, NudgeEmailSentAt).
/// </summary>
public static class OnboardingEmails
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    /// <summary>How long after sign-up a welcome of either kind can still go out.</summary>
    public static readonly TimeSpan WelcomeWindow = TimeSpan.FromDays(3);

    private const string ReplyLine = "Questions or stuck on something? Just reply. A real person reads every email.";
    private const string TrialLine = "Your 30-day trial is free, and we never asked for a card.";
    private const string EstimatesLine = "Estimates are based on your plan and assumed returns. They're not financial advice.";
    private const string Footer = "You're getting this because you started a Dollars at Work free trial.";

    private static string Money(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero).ToString("$#,##0;-$#,##0", Invariant);

    /// <summary>
    /// The hour-1 welcome, with the person's own numbers worked out by the browser. Rows whose number is missing are left out.
    /// </summary>
    public static EmailMessage Welcome(int? debtFreeMonth, decimal? netWorthIn10Years, DateTimeOffset now, string appUrl)
    {
        var ahead = new List<EmailLayout.Row>();
        if (netWorthIn10Years is { } ten)
            ahead.Add(new EmailLayout.Row("Net worth in 10 years", $"about {Money(ten)}"));
        if (debtFreeMonth is { } months and > 0)
            ahead.Add(new EmailLayout.Row("Debt-free", DateOnly.FromDateTime(now.UtcDateTime.AddMonths(months)).ToString("MMMM yyyy", Invariant)));

        return new EmailLayout(appUrl)
            .Preheader("Your plan is set up. Here's where it's headed.")
            .Heading("Your dollars just clocked in")
            .Paragraph("Your plan is set up and every dollar has a job. Here's where this month's plan is headed if you stick with it.")
            .Rows("Where you're headed", ahead)
            .Paragraph("Now the fun part: move a dollar from one category to another on the Plan page and watch these numbers change as you type.")
            .Button("Move a dollar", $"{appUrl}/plan")
            .Paragraph(TrialLine)
            .Small(ReplyLine)
            .Small(EstimatesLine)
            .FooterNote(Footer)
            .Build("Your dollars clocked in");
    }

    /// <summary>For someone who signed up but never reached the dashboard, an hour or more later.</summary>
    public static EmailMessage PlanWaiting(string appUrl) =>
        new EmailLayout(appUrl)
            .Preheader("About three minutes to see where your money can take you.")
            .Heading("Your plan is waiting")
            .Paragraph("You signed up for Dollars at Work but haven't built your plan yet. No rush, it's right where you left it.")
            .Paragraph("It takes about three minutes: add your monthly income and a few categories, and you'll see where you're headed.")
            .Button("Build my plan", $"{appUrl}/welcome")
            .Small(ReplyLine)
            .FooterNote(Footer)
            .Build("Your plan is waiting");

    /// <summary>The day-3 nudge: try one what-if scenario.</summary>
    public static EmailMessage Nudge(string appUrl) =>
        new EmailLayout(appUrl)
            .Preheader("Pay extra on debt? A raise? A house in 2029? See it on one chart.")
            .Heading("Try one what-if")
            .Paragraph("Pick one question. Pay an extra $100 a month toward debt? A raise next year? A house in 2029?")
            .Paragraph("Save it as a scenario and compare it with your real plan on one chart. Your real plan stays exactly as it is.")
            .Button("Try a what-if", $"{appUrl}/what-if")
            .Paragraph(TrialLine)
            .Small(ReplyLine)
            .Small(EstimatesLine)
            .FooterNote(Footer)
            .Build("Try one what-if");
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

        var message = OnboardingEmails.PlanWaiting(BaseUrl);
        var sent = 0;
        foreach (var user in due)
        {
            if (user.Email is null) continue;
            await sender.SendAsync(user.Email, message, ct);
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

        var message = OnboardingEmails.Nudge(BaseUrl);
        var sent = 0;
        foreach (var user in due)
        {
            if (user.Email is null) continue;
            await sender.SendAsync(user.Email, message, ct);
            user.NudgeEmailSentAt = now;
            sent++;
        }
        return sent;
    }
}
