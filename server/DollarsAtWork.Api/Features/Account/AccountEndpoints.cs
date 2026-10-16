using System.Net.Mail;
using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Domain;
using DollarsAtWork.Api.Features.Billing;
using DollarsAtWork.Api.Features.NetWorth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Features.Account;

/// <summary>
/// Things a signed-in person does to their own account. These stay open to expired accounts:
/// anyone can always change their password, take their data with them, or leave.
/// </summary>
public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this RouteGroupBuilder api)
    {
        var account = api.MapGroup("/account").WithTags("Account");

        account.MapPost("/change-password", ChangePassword).RequireAuthorization().RequireRateLimiting(RateLimits.Auth);
        account.MapPost("/change-email", RequestEmailChange).RequireAuthorization().RequireRateLimiting(RateLimits.Auth);
        account.MapPost("/confirm-email-change", ConfirmEmailChange).RequireRateLimiting(RateLimits.Auth);
        account.MapGet("/export", Export).RequireAuthorization();
        account.MapPost("/delete", DeleteAccount).RequireAuthorization().RequireRateLimiting(RateLimits.Auth);
        account.MapPost("/welcome-email", SendWelcomeEmail).RequireAuthorization().RequireRateLimiting(RateLimits.Auth);

        return api;
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        var result = await users.ChangePasswordAsync(user, request.CurrentPassword ?? "", request.NewPassword ?? "");
        if (!result.Succeeded)
        {
            var check = new Validation();
            foreach (var error in result.Errors)
                check.Add(error.Code == "PasswordMismatch" ? "currentPassword" : "newPassword",
                    error.Code == "PasswordMismatch" ? "That isn't your current password." : error.Description);
            return check.ToResult();
        }

        // Changing the password signs every other device out; keep this one signed in.
        await signIn.RefreshSignInAsync(user);
        return Results.NoContent();
    }

    private static async Task<IResult> RequestEmailChange(
        ChangeEmailRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AccountEmails emails,
        CancellationToken ct)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        var check = new Validation();
        var newEmail = request.NewEmail?.Trim() ?? "";
        if (newEmail.Length is 0 or > 254 || !MailAddress.TryCreate(newEmail, out var parsed) || parsed.Address != newEmail)
            check.Add("newEmail", "Enter a valid email address.");
        else if (string.Equals(newEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            check.Add("newEmail", "That's already your email address.");
        if (!await users.CheckPasswordAsync(user, request.CurrentPassword ?? ""))
            check.Add("currentPassword", "That isn't your current password.");
        if (check.Failed)
            return check.ToResult();

        // Same answer whether or not the address is free, so this can't be used to discover who has an account.
        if (await users.FindByEmailAsync(newEmail) is null)
            await emails.SendEmailChangeAsync(user, newEmail, ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ConfirmEmailChange(
        ConfirmEmailChangeRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        BillingService billing,
        CancellationToken ct)
    {
        var invalid = Results.ValidationProblem(new Dictionary<string, string[]> { ["token"] = ["This link is invalid or has expired. Ask for a new one from your profile."] });

        var token = AccountEmails.Decode(request.Token);
        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is null || token is null || string.IsNullOrWhiteSpace(request.Email))
            return invalid;

        var result = await users.ChangeEmailAsync(user, request.Email, token);
        if (!result.Succeeded)
            return invalid;

        // The email is also the sign-in name.
        await users.SetUserNameAsync(user, request.Email);
        await billing.UpdateCustomerEmailAsync(user, ct);

        if (principal.Identity?.IsAuthenticated == true && principal.GetUserId() == user.Id)
            await signIn.RefreshSignInAsync(user);
        return Results.NoContent();
    }

    private static async Task<IResult> Export(string? format, ClaimsPrincipal principal, UserManager<AppUser> users, AccountExport export, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        return format?.ToLowerInvariant() switch
        {
            "csv" => Results.File(await export.ToCsvZipAsync(user, ct), "application/zip", "dollars-at-work-export.zip"),
            null or "" or "json" => Results.File(await export.ToJsonAsync(user, ct), "application/json", "dollars-at-work-export.json"),
            _ => Results.ValidationProblem(new Dictionary<string, string[]> { ["format"] = ["Choose json or csv."] }),
        };
    }

    /// <summary>
    /// Sends the hour-1 welcome with the person's own numbers, once. The browser calls this the first time the dashboard
    /// has a projection; a second call (another tab, another day) does nothing. Only ever goes to the person's own address.
    /// </summary>
    private static async Task<IResult> SendWelcomeEmail(
        WelcomeEmailRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        IAppEmailSender sender,
        IOptions<AppOptions> options,
        TimeProvider clock,
        CancellationToken ct)
    {
        var check = new Validation();
        if (request.DebtFreeMonth is < 0 or > ReportEmail.MaxMonths)
            check.Add("debtFreeMonth", "That date isn't valid.");
        if (request.NetWorthIn10Years is { } ten && Math.Abs(ten) > ReportEmail.MaxNetWorth)
            check.Add("netWorthIn10Years", "That amount isn't valid.");
        if (check.Failed)
            return check.ToResult();

        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user?.Email is null)
            return Results.Unauthorized();
        if (user.WelcomeEmailSentAt is not null)
            return Results.NoContent();

        var now = clock.GetUtcNow();
        // A welcome only makes sense in the first days. Older accounts (made before this email existed) are marked done, not emailed.
        if (now - user.CreatedAt <= OnboardingEmails.WelcomeWindow)
        {
            var (subject, body) = OnboardingEmails.Welcome(request.DebtFreeMonth, request.NetWorthIn10Years, now, options.Value.PublicUrl.TrimEnd('/'));
            await sender.SendAsync(user.Email, subject, body, ct);
        }
        user.WelcomeEmailSentAt = now;
        await users.UpdateAsync(user);
        return Results.NoContent();
    }

    /// <summary>Cancels billing, then deletes the user. Every table cascades from the user, so nothing is left behind.</summary>
    private static async Task<IResult> DeleteAccount(
        DeleteAccountRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        BillingService billing,
        CancellationToken ct)
    {
        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        if (!await users.CheckPasswordAsync(user, request.Password ?? ""))
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["password"] = ["That isn't your password."] });

        // Stop the billing first: if Stripe can't be reached, the account stays so nobody is charged for a deleted account.
        try
        {
            await billing.CancelForDeletedAccountAsync(user.Id, ct);
        }
        catch (Stripe.StripeException ex)
        {
            return Results.Problem(
                title: "We couldn't cancel your subscription, so your account hasn't been deleted.",
                detail: ex.StripeError?.Message ?? "Please try again in a moment.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        var result = await users.DeleteAsync(user);
        if (!result.Succeeded)
            return Results.Problem(title: "We couldn't delete your account. Please try again.", statusCode: StatusCodes.Status500InternalServerError);

        await signIn.SignOutAsync();
        return Results.NoContent();
    }
}
