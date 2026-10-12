using System.Threading.RateLimiting;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using DollarsAtWork.Api.Features.Account;
using DollarsAtWork.Api.Features.Auth;
using DollarsAtWork.Api.Features.Billing;
using DollarsAtWork.Api.Features.Debts;
using DollarsAtWork.Api.Features.Investments;
using DollarsAtWork.Api.Features.NetWorth;
using DollarsAtWork.Api.Features.Plan;
using DollarsAtWork.Api.Features.Savings;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---------- Data ----------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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
});

// ---------- App services ----------
builder.Services.Configure<AppOptions>(builder.Configuration.GetSection("App"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IAppEmailSender, LoggingEmailSender>();
builder.Services.AddScoped<AccountEmails>();
builder.Services.AddScoped<AccountSetup>();
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection("Stripe"));
builder.Services.AddScoped<BillingService>();
builder.Services.AddScoped<AccountExport>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<TrialEmailService>();
builder.Services.AddHostedService<TrialEmailWorker>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // JSON description of the API at /openapi/v1.json

    // Keep the local database in step with the code's migrations.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseHttpsRedirection();

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
api.MapDebtsEndpoints();
api.MapSavingsEndpoints();
api.MapInvestmentsEndpoints();
api.MapNetWorthEndpoints();
api.MapBillingEndpoints();
api.MapFallback(() => Results.NotFound()); // unknown /api routes never fall through to the React app

app.MapFallbackToFile("index.html");

app.Run();

public static class RateLimits
{
    public const string Auth = "auth";
}

// Lets integration tests reference the app.
public partial class Program { }
