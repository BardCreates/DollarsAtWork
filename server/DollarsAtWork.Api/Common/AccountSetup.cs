using System.Security.Cryptography;
using System.Text;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Common;

/// <summary>Creates everything a brand-new account needs: its plan, the three built-in categories and a 30-day trial.</summary>
public class AccountSetup(AppDbContext db, TimeProvider clock)
{
    public static readonly (CategoryKind Kind, string Name, string Color)[] BuiltIns =
    [
        (CategoryKind.Savings, "Savings", "#19c37d"),
        (CategoryKind.Debt, "Debt", "#ff5c5c"),
        (CategoryKind.Investment, "Investments", "#4aa8ff"),
    ];

    /// <summary>A one-way fingerprint of an email address, the same for "A@x.com" and "a@x.com ".</summary>
    public static string HashEmail(string email) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(email.Trim().ToUpperInvariant())));

    /// <summary>
    /// Adds the defaults to the context. The caller saves, so it can share a transaction with user creation.
    /// An email that has already had a trial starts with it used up: read-only until they subscribe.
    /// Returns true when a fresh 30-day trial started.
    /// </summary>
    public async Task<bool> AddDefaultsAsync(Guid userId, string email, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var emailHash = HashEmail(email);
        var trialUsed = await db.UsedTrials.AnyAsync(t => t.EmailHash == emailHash, ct);
        if (!trialUsed)
            db.UsedTrials.Add(new UsedTrial { EmailHash = emailHash, UsedAt = now });

        db.Plans.Add(new Plan
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MonthlyIncome = 0m,
            CreatedAt = now,
            UpdatedAt = now,
        });

        for (var i = 0; i < BuiltIns.Length; i++)
        {
            var (kind, name, color) = BuiltIns[i];
            db.Categories.Add(new Category
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Kind = kind,
                Name = name,
                Color = color,
                Amount = 0m,
                SortOrder = i,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = SubscriptionStatus.Trialing,
            TrialEndsAt = trialUsed ? now : now.AddDays(Subscription.TrialDays),
            // No "your trial has ended" email for a trial that never started.
            TrialEmailStage = trialUsed ? TrialEmailStage.Ended : TrialEmailStage.None,
            CreatedAt = now,
            UpdatedAt = now,
        });

        return !trialUsed;
    }
}
