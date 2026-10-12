using System.Net.Mail;
using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Auth;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth").WithTags("Auth");

        auth.MapPost("/register", Register).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/login", Login).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/logout", Logout).RequireAuthorization();
        auth.MapGet("/me", Me).RequireAuthorization();
        auth.MapPost("/forgot-password", ForgotPassword).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/reset-password", ResetPassword).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/confirm-email", ConfirmEmail).RequireRateLimiting(RateLimits.Auth);
        auth.MapPost("/resend-confirmation", ResendConfirmation).RequireAuthorization().RequireRateLimiting(RateLimits.Auth);

        return api;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        AppDbContext db,
        AccountSetup setup,
        AccountEmails emails,
        TimeProvider clock,
        CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (email is null)
            return Invalid("email", "Enter a valid email address.");

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            CreatedAt = clock.GetUtcNow(),
        };

        // User, plan, built-in categories and trial are created together or not at all.
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            var created = await users.CreateAsync(user, request.Password ?? "");
            if (!created.Succeeded)
                return Results.ValidationProblem(ToErrors(created));

            setup.AddDefaults(user.Id);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        await emails.SendConfirmationAsync(user, ct);
        await signIn.SignInAsync(user, isPersistent: true);

        return Results.Ok(await BuildMe(user, db, clock, ct));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        var user = email is null ? null : await users.FindByEmailAsync(email);
        if (user is null)
            return WrongCredentials();

        var result = await signIn.PasswordSignInAsync(user, request.Password ?? "", request.RememberMe, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return Results.Problem(
                title: "Too many sign-in attempts.",
                detail: "For your security this account is locked for 15 minutes. You can reset your password instead.",
                statusCode: StatusCodes.Status423Locked);

        if (!result.Succeeded)
            return WrongCredentials();

        return Results.Ok(await BuildMe(user, db, clock, ct));
    }

    private static async Task<IResult> Logout(SignInManager<AppUser> signIn)
    {
        await signIn.SignOutAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> Me(
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AppDbContext db,
        TimeProvider clock,
        CancellationToken ct)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        return user is null
            ? Results.Unauthorized()
            : Results.Ok(await BuildMe(user, db, clock, ct));
    }

    private static async Task<IResult> ForgotPassword(
        ForgotPasswordRequest request,
        UserManager<AppUser> users,
        AccountEmails emails,
        CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        var user = email is null ? null : await users.FindByEmailAsync(email);
        if (user is not null)
            await emails.SendPasswordResetAsync(user, ct);

        // Same answer whether or not the account exists, so this can't be used to discover emails.
        return Results.NoContent();
    }

    private static async Task<IResult> ResetPassword(ResetPasswordRequest request, UserManager<AppUser> users)
    {
        var email = NormalizeEmail(request.Email);
        var token = AccountEmails.Decode(request.Token);
        var user = email is null ? null : await users.FindByEmailAsync(email);
        if (user is null || token is null)
            return Invalid("token", "This reset link is invalid or has expired. Request a new one.");

        var result = await users.ResetPasswordAsync(user, token, request.NewPassword ?? "");
        if (!result.Succeeded)
            return Results.ValidationProblem(ToErrors(result));

        // A successful reset also clears any lockout.
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);
        return Results.NoContent();
    }

    private static async Task<IResult> ConfirmEmail(ConfirmEmailRequest request, UserManager<AppUser> users)
    {
        var token = AccountEmails.Decode(request.Token);
        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is null || token is null)
            return Invalid("token", "This confirmation link is invalid.");

        if (user.EmailConfirmed)
            return Results.NoContent();

        var result = await users.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Results.NoContent()
            : Invalid("token", "This confirmation link is invalid or has expired.");
    }

    private static async Task<IResult> ResendConfirmation(
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AccountEmails emails,
        CancellationToken ct)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        if (!user.EmailConfirmed)
            await emails.SendConfirmationAsync(user, ct);

        return Results.NoContent();
    }

    private static async Task<MeResponse> BuildMe(AppUser user, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var subscription = await db.Subscriptions.AsNoTracking().SingleAsync(s => s.UserId == user.Id, ct);
        return new MeResponse(user.Id, user.Email!, user.EmailConfirmed, AccessResponse.From(subscription, clock.GetUtcNow()));
    }

    private static string? NormalizeEmail(string? email)
    {
        var trimmed = email?.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length > 254) return null;
        return MailAddress.TryCreate(trimmed, out var address) && address.Address == trimmed ? trimmed : null;
    }

    private static IResult WrongCredentials() =>
        Results.Problem(title: "Incorrect email or password.", statusCode: StatusCodes.Status401Unauthorized);

    private static IResult Invalid(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });

    /// <summary>Groups Identity's errors under the form field they belong to.</summary>
    private static Dictionary<string, string[]> ToErrors(IdentityResult result) =>
        result.Errors
            .GroupBy(e => e.Code switch
            {
                var c when c.Contains("Password", StringComparison.OrdinalIgnoreCase) => "password",
                var c when c.Contains("Email", StringComparison.OrdinalIgnoreCase)
                        || c.Contains("UserName", StringComparison.OrdinalIgnoreCase) => "email",
                var c when c.Contains("Token", StringComparison.OrdinalIgnoreCase) => "token",
                _ => "form",
            })
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.Code is "DuplicateUserName" or "DuplicateEmail"
                        ? "An account with this email already exists. Try signing in."
                        : e.Description)
                    .Distinct()
                    .ToArray());
}
