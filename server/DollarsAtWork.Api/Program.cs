using System.Threading.RateLimiting;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using DollarsAtWork.Api.Features.Account;
using DollarsAtWork.Api.Features.Auth;
using DollarsAtWork.Api.Features.Billing;
using DollarsAtWork.Api.Features.Debts;
using DollarsAtWork.Api.Features.Email;
using DollarsAtWork.Api.Features.Hints;
using DollarsAtWork.Api.Features.Investments;
using DollarsAtWork.Api.Features.NetWorth;
using DollarsAtWork.Api.Features.Scenarios;
using DollarsAtWork.Api.Features.Plan;
using DollarsAtWork.Api.Features.Savings;
using DollarsAtWork.Api.Features.Usage;
using DollarsAtWork.Api.Features.Waitlist;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---------- Error tracking (Sentry) ----------
// On only when Sentry:Dsn is set (Sentry__Dsn on the host). Reports server errors without personal data:
// no request bodies (what people typed), no cookies or user IPs, and no performance tracing.
if (builder.Configuration["Sentry:Dsn"] is { Length: > 0 } sentryDsn)
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = builder.Environment.EnvironmentName;
        options.SendDefaultPii = false;
        options.MaxRequestBodySize = Sentry.Extensibility.RequestSize.None;
        options.TracesSampleRate = 0;
    });
}

// ---------- Data ----------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        // Azure SQL drops connections now and then (failover, a paused database waking up).
        // Retry those briefly instead of showing the visitor an error page. Code that opens
        // its own transaction must run it through db.Database.CreateExecutionStrategy().
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

// ---------- Accounts (ASP.NET Core Identity, cookie sign-in) ----------
builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
        // Confirmation emails are sent, but not required to sign in during version 1.
        options.SignIn.RequireConfirmedEmail = false;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "daw.auth";
    options.Cookie.HttpOnly = true;                       // not readable by JavaScript
    options.Cookie.SameSite = SameSiteMode.Strict;        // not sent on requests from other sites
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);
    options.SlidingExpiration = true;
    // This is an API: answer 401/403 instead of redirecting to a login page.
    options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
});

builder.Services.AddAuthorization();

// ---------- Abuse protection ----------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimits.Auth, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    // Forms anyone can send without an account (the waitlist): a few a minute is plenty for a person.
    options.AddPolicy(RateLimits.PublicForm, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1) }));
    // One-click unsubscribes (RFC 8058) arrive from a handful of mail-provider servers, so a per-IP limit must be
    // generous: a refused request would leave someone subscribed without knowing. The sealed token is the only key.
    options.AddPolicy(RateLimits.Unsubscribe, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 600, Window = TimeSpan.FromMinutes(1) }));
    // Anonymous usage counts (page visits, calculator use): one per page view, so roomier than a form, and kept
    // apart from the waitlist's budget so clicking around never blocks the form.
    options.AddPolicy(RateLimits.Usage, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- App services ----------
builder.Services.Configure<AppOptions>(builder.Configuration.GetSection("App"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
if (!(builder.Configuration["Email:ResendApiKey"] ?? "").StartsWith("re_", StringComparison.Ordinal))
{
    // No real provider key (Resend keys start with "re_"): print emails to the console instead of sending.
    // Development, or a host whose placeholder key hasn't been replaced yet.
    builder.Services.AddScoped<IAppEmailSender, LoggingEmailSender>();
}
else
{
    builder.Services.AddHttpClient<IAppEmailSender, ResendEmailSender>(client =>
        client.Timeout = TimeSpan.FromSeconds(15));
}
builder.Services.AddScoped<AccountEmails>();
builder.Services.AddSingleton<EmailUnsubscribe>();
builder.Services.AddScoped<AccountSetup>();
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection("Stripe"));
builder.Services.AddScoped<BillingService>();
builder.Services.AddScoped<AccountExport>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<TrialEmailService>();
builder.Services.AddScoped<OnboardingEmailService>();
builder.Services.AddScoped<RetentionService>();
builder.Services.AddHostedService<TrialEmailWorker>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // JSON description of the API at /openapi/v1.json
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();

    // Production: refuse to start half-configured rather than fail on the first sign-up.
    foreach (var key in new[] { "ConnectionStrings:Default", "App:PublicUrl", "Email:ResendApiKey", "Email:From",
                                "Stripe:SecretKey", "Stripe:WebhookSecret", "Stripe:MonthlyPriceId", "Stripe:AnnualPriceId" })
    {
        if (string.IsNullOrWhiteSpace(app.Configuration[key]))
            throw new InvalidOperationException($"Missing required setting '{key}'. Set it in the host's application settings.");
    }
    // A placeholder email key would quietly switch to printing emails in the log, so nobody gets a reset link.
    if (!(app.Configuration["Email:ResendApiKey"] ?? "").StartsWith("re_", StringComparison.Ordinal))
        throw new InvalidOperationException("Email:ResendApiKey isn't a Resend key (they start with \"re_\"). Set the real key in the host's application settings.");
}

// Keep the database in step with the code's migrations, in every environment. The app runs as one instance,
// so there is no race; if that changes, move this to a deploy step.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseHttpsRedirection();

// Security headers on every response, the React app's files included (the Security page describes these):
// - nosniff: browsers treat each file as the type we say, never guess.
// - frame-ancestors / X-Frame-Options: no other site can put our pages in a frame (clickjacking).
// - Referrer-Policy same-origin: an address with a reset or confirm token in it is never sent to another site.
// - Permissions-Policy: the app uses no camera, microphone, location, payment or USB features, so none can be asked for.
// Set as the response starts, so error pages (which clear headers when they're rewritten) carry them too.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["Content-Security-Policy"] = "frame-ancestors 'none'";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "same-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
        return Task.CompletedTask;
    });
    await next();
});

// In production the built React app lives in wwwroot and is served from the same address as the API.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api");
api.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
api.MapAuthEndpoints();
api.MapAccountEndpoints();
api.MapPlanEndpoints();
api.MapIncomeEndpoints();
api.MapDebtsEndpoints();
api.MapSavingsEndpoints();
api.MapInvestmentsEndpoints();
api.MapNetWorthEndpoints();
api.MapScenarioEndpoints();
api.MapBillingEndpoints();
api.MapHintsEndpoints();
api.MapWaitlistEndpoints();
api.MapUsageEndpoints();
api.MapEmailEndpoints();
api.MapFallback(() => Results.NotFound()); // unknown /api routes never fall through to the React app

app.MapFallbackToFile("index.html");

app.Run();

public static class RateLimits
{
    public const string Auth = "auth";
    public const string PublicForm = "public-form";
    public const string Usage = "usage";
    public const string Unsubscribe = "unsubscribe";
}

// Lets integration tests reference the app.
public partial class Program { }
