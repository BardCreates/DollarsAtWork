using Microsoft.AspNetCore.Identity;

namespace DollarsAtWork.Api.Domain;

/// <summary>A signed-in person. Identity owns email, password hash, lockout and email confirmation.</summary>
public class AppUser : IdentityUser<Guid>
{
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// What a category is for. The three built-in kinds link to their modules and exist exactly once per user.
/// Modules always look categories up by Kind, never by name.
/// </summary>
public enum CategoryKind
{
    Custom = 0,
    Savings = 1,
    Debt = 2,
    Investment = 3,
}

/// <summary>One monthly plan per user: income plus the settings that drive projections.</summary>
public class Plan
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal MonthlyIncome { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>A slice of the monthly plan. Built-ins can be reordered and re-amounted but not renamed or deleted.</summary>
public class Category
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public CategoryKind Kind { get; set; }
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
    public string Color { get; set; } = "#19c37d";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public bool IsBuiltIn => Kind != CategoryKind.Custom;
}

public enum SubscriptionStatus
{
    Trialing = 0,
    Active = 1,
    PastDue = 2,
    Canceled = 3,
    Expired = 4,
}

/// <summary>
/// Billing state for a user. Created as a 30-day trial at sign-up; after that only Stripe webhooks change it.
/// </summary>
public class Subscription
{
    public const int TrialDays = 30;
    public static readonly TimeSpan PastDueGrace = TimeSpan.FromDays(7);

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public SubscriptionStatus Status { get; set; }
    public DateTimeOffset TrialEndsAt { get; set; }
    public DateTimeOffset? CurrentPeriodEnd { get; set; }
    public DateTimeOffset? PastDueSince { get; set; }
    public string? BillingInterval { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>The status the user should experience right now, accounting for dates that have passed.</summary>
    public SubscriptionStatus EffectiveStatus(DateTimeOffset now) => Status switch
    {
        SubscriptionStatus.Trialing when now >= TrialEndsAt => SubscriptionStatus.Expired,
        SubscriptionStatus.PastDue when PastDueSince is { } since && now >= since + PastDueGrace => SubscriptionStatus.Expired,
        SubscriptionStatus.Canceled when CurrentPeriodEnd is not { } end || now >= end => SubscriptionStatus.Expired,
        _ => Status,
    };

    /// <summary>True when the user may create and edit data. Expired users keep read-only access.</summary>
    public bool HasFullAccess(DateTimeOffset now) => EffectiveStatus(now) != SubscriptionStatus.Expired;
}
