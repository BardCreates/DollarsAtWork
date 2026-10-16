using Microsoft.AspNetCore.Identity;

namespace DollarsAtWork.Api.Domain;

/// <summary>A signed-in person. Identity owns email, password hash, lockout and email confirmation.</summary>
public class AppUser : IdentityUser<Guid>
{
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>True when the person has turned first-time hints off everywhere.</summary>
    public bool HintsOff { get; set; }

    /// <summary>Ids of the hints this person has closed one by one, comma-separated (see HintIds).</summary>
    public string DismissedHints { get; set; } = "";

    /// <summary>
    /// The page whose sign-up button this person used, such as "blog/gas-prices" or "tools/payoff", so the owner can see
    /// which pages bring in trials. Null when unknown. Set once, at sign-up.
    /// </summary>
    public string? SignupSource { get; set; }

    /// <summary>
    /// When the first onboarding email went out: either the hour-1 welcome with the person's own numbers (sent when the
    /// dashboard first has a projection) or the "your plan is waiting" fallback an hour after sign-up. Null until then.
    /// </summary>
    public DateTimeOffset? WelcomeEmailSentAt { get; set; }

    /// <summary>When the day-3 "try one what-if" nudge went out. Null until then.</summary>
    public DateTimeOffset? NudgeEmailSentAt { get; set; }
}

/// <summary>
/// Someone who asked to hear when Dollars at Work launches. Not tied to an account; the address is kept
/// lower-cased so the same person can't be listed twice.
/// </summary>
public class WaitlistEntry
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    /// <summary>Which page the address came from (home, tools, demo…), to see which pages bring people in.</summary>
    public string Source { get; set; } = "";
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
    public DebtStrategy DebtStrategy { get; set; } = DebtStrategy.Snowball;
    public SavingsSplitMode SavingsSplitMode { get; set; } = SavingsSplitMode.Priority;
    /// <summary>Where the debt budget goes once every debt is paid.</summary>
    public FreedMoneyDestination DebtDoneDestination { get; set; } = FreedMoneyDestination.Investments;
    /// <summary>Where the savings amount goes once every goal is full.</summary>
    public FreedMoneyDestination SavingsDoneDestination { get; set; } = FreedMoneyDestination.Investments;
    /// <summary>Yearly inflation as a percent, used for "today's dollars".</summary>
    public decimal InflationRate { get; set; } = 3m;
    /// <summary>Expected yearly raise as a percent.</summary>
    public decimal IncomeGrowthRate { get; set; }
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

/// <summary>Which debt gets the money left after every minimum is paid.</summary>
public enum DebtStrategy
{
    /// <summary>Smallest balance first.</summary>
    Snowball = 0,
    /// <summary>Highest APR first.</summary>
    Avalanche = 1,
    /// <summary>The user's own order (SortOrder).</summary>
    Custom = 2,
}

public enum DebtType
{
    CreditCard = 0,
    Auto = 1,
    Student = 2,
    Mortgage = 3,
    Medical = 4,
    Other = 5,
}

/// <summary>Something owed. The balance changes only when the user updates it.</summary>
public class Debt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public DebtType Type { get; set; }
    public decimal Balance { get; set; }
    /// <summary>Annual percentage rate as a percent: 19.99 means 19.99%.</summary>
    public decimal Apr { get; set; }
    public decimal MinPayment { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>How the monthly savings amount is shared between goals.</summary>
public enum SavingsSplitMode
{
    /// <summary>Fill goals top to bottom.</summary>
    Priority = 0,
    /// <summary>Each goal gets its SharePercent.</summary>
    Percent = 1,
}

/// <summary>Something being saved for. The balance changes only when the user updates it.</summary>
public class SavingsGoal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public decimal TargetAmount { get; set; }
    public decimal CurrentBalance { get; set; }
    public DateOnly? TargetDate { get; set; }
    /// <summary>Annual percentage yield as a percent: 4.5 means 4.5%.</summary>
    public decimal Apy { get; set; }
    /// <summary>Position in the list; lower fills first in Priority mode.</summary>
    public int Priority { get; set; }
    /// <summary>Share of the monthly savings amount in Percent mode.</summary>
    public decimal SharePercent { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public enum InvestmentAccountType
{
    Retirement401k = 0,
    Ira = 1,
    RothIra = 2,
    Brokerage = 3,
    Hsa = 4,
    Other = 5,
}

/// <summary>An investment account. The balance changes only when the user updates it.</summary>
public class InvestmentAccount
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public InvestmentAccountType Type { get; set; }
    public decimal Balance { get; set; }
    /// <summary>Expected yearly return as a percent: 7 means 7%.</summary>
    public decimal ExpectedReturn { get; set; }
    /// <summary>Share of the monthly investment amount. All accounts together total 100.</summary>
    public decimal SharePercent { get; set; }
    /// <summary>Employer adds this percent of each contribution. Null means no match.</summary>
    public decimal? MatchPercent { get; set; }
    /// <summary>The match applies to contributions up to this percent of income. Null means no cap.</summary>
    public decimal? MatchLimitPercent { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>Where a monthly amount goes once its own job is finished.</summary>
public enum FreedMoneyDestination
{
    Investments = 0,
    Savings = 1,
    Debt = 2,
    /// <summary>Back to unplanned money; no longer projected.</summary>
    Remaining = 3,
}

public enum OtherItemKind
{
    Asset = 0,
    Liability = 1,
}

public enum OtherItemType
{
    Home = 0,
    Vehicle = 1,
    Cash = 2,
    Valuables = 3,
    Business = 4,
    Loan = 5,
    Other = 6,
}

/// <summary>Something owned or owed that isn't tracked month by month, such as a home or a car.</summary>
public class OtherItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public OtherItemKind Kind { get; set; }
    public OtherItemType Type { get; set; }
    public decimal Value { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>Net worth as confirmed at a monthly check-in. One per calendar month.</summary>
public class NetWorthSnapshot
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Assets { get; set; }
    public decimal Liabilities { get; set; }
    public decimal NetWorth { get; set; }
    /// <summary>Totals by area at the time of the check-in. Null on snapshots taken before these were recorded.</summary>
    public decimal? Savings { get; set; }
    public decimal? Investments { get; set; }
    public decimal? Debts { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public enum SubscriptionStatus
{
    Trialing = 0,
    Active = 1,
    PastDue = 2,
    Canceled = 3,
    Expired = 4,
}

/// <summary>The trial emails, in the order they go out.</summary>
public enum TrialEmailStage
{
    None = 0,
    SevenDaysLeft = 1,
    TwoDaysLeft = 2,
    Ended = 3,
}

/// <summary>
/// Remembers that an email address has had its free trial, so deleting an account and signing up again
/// doesn't give another one. Only a one-way hash of the address is kept, and it outlives the account.
/// </summary>
public class UsedTrial
{
    public string EmailHash { get; set; } = "";
    public DateTimeOffset UsedAt { get; set; }
}

/// <summary>
/// A saved "what if" version of the plan: the real plan plus a handful of changes. Never changes the real plan.
/// </summary>
public class Scenario
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
    /// <summary>The changes, as JSON (see ScenarioOverrides). Anything not listed follows the real plan.</summary>
    public string OverridesJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>A Stripe webhook event that has been handled, so a repeat delivery is ignored.</summary>
public class ProcessedStripeEvent
{
    public string EventId { get; set; } = "";
    public DateTimeOffset ReceivedAt { get; set; }
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
    /// <summary>The latest trial email this account has been sent.</summary>
    public TrialEmailStage TrialEmailStage { get; set; }
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
