using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;

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

    /// <summary>Adds the defaults to the context. The caller saves, so it can share a transaction with user creation.</summary>
    public void AddDefaults(Guid userId)
    {
        var now = clock.GetUtcNow();

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
            TrialEndsAt = now.AddDays(Subscription.TrialDays),
            CreatedAt = now,
            UpdatedAt = now,
        });
    }
}
