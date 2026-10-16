using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// The anonymous counts the owner reads on the Numbers page. The browser may only send the first group (page visits,
/// calculator use, first projection); the server records the rest itself where they happen, so they can't be made up.
/// </summary>
public static class UsageEvents
{
    public const int MaxNameLength = 40;
    public const int MaxSourceLength = 60;

    public const string VisitHome = "visit_home";
    public const string VisitTools = "visit_tools";
    public const string VisitDemo = "visit_demo";
    public const string VisitPricing = "visit_pricing";
    public const string VisitBlog = "visit_blog";
    public const string CalculatorUsed = "calculator_used";
    public const string FirstProjection = "first_projection";
    public const string Signup = "signup";
    public const string TrialStarted = "trial_started";
    public const string Subscribed = "subscribed";

    /// <summary>Names the browser may send to POST /api/usage.</summary>
    public static readonly IReadOnlySet<string> FromBrowser = new HashSet<string>(StringComparer.Ordinal)
    {
        VisitHome, VisitTools, VisitDemo, VisitPricing, VisitBlog, CalculatorUsed, FirstProjection,
    };

    /// <summary>Every name, in the order the Numbers page lists them.</summary>
    public static readonly IReadOnlyList<string> All =
    [
        VisitHome, VisitTools, VisitDemo, VisitPricing, VisitBlog, CalculatorUsed, Signup, TrialStarted, FirstProjection, Subscribed,
    ];

    /// <summary>Adds one event to the context. The caller saves, so it shares the caller's transaction.</summary>
    public static void Record(AppDbContext db, TimeProvider clock, string name, string? source = null)
    {
        var cleaned = SignupSources.Clean(source);
        if (cleaned is { Length: > MaxSourceLength })
            cleaned = null;

        db.UsageEvents.Add(new UsageEvent { Id = Guid.NewGuid(), Name = name, Source = cleaned, At = clock.GetUtcNow() });
    }
}
