using System.Text;
using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;

namespace DollarsAtWork.Api.Common;

public interface IAppEmailSender
{
    Task SendAsync(string to, string subject, string body, CancellationToken ct = default);
}

/// <summary>
/// Development sender: writes emails to the console log instead of sending them.
/// Replaced by a real provider (Postmark or Resend) when trial emails are built.
/// </summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IAppEmailSender
{
    public Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        logger.LogInformation("EMAIL to {To}\nSubject: {Subject}\n{Body}", to, subject, body);
        return Task.CompletedTask;
    }
}

public class AppOptions
{
    /// <summary>Address of the web app, used to build links in emails. Dev: the Vite server.</summary>
    public string PublicUrl { get; set; } = "http://localhost:5173";
}

/// <summary>Builds and sends the account emails (confirm address, reset password).</summary>
public class AccountEmails(
    UserManager<AppUser> users,
    IAppEmailSender sender,
    Microsoft.Extensions.Options.IOptions<AppOptions> options)
{
    private string BaseUrl => options.Value.PublicUrl.TrimEnd('/');

    public async Task SendConfirmationAsync(AppUser user, CancellationToken ct = default)
    {
        var token = Encode(await users.GenerateEmailConfirmationTokenAsync(user));
        var link = $"{BaseUrl}/confirm-email?userId={user.Id}&token={token}";
        await sender.SendAsync(user.Email!, "Confirm your Dollars at Work email",
            $"Welcome to Dollars at Work!\n\nConfirm your email address:\n{link}", ct);
    }

    public async Task SendPasswordResetAsync(AppUser user, CancellationToken ct = default)
    {
        var token = Encode(await users.GeneratePasswordResetTokenAsync(user));
        var link = $"{BaseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={token}";
        await sender.SendAsync(user.Email!, "Reset your Dollars at Work password",
            $"Someone asked to reset your password. If it was you, use this link within 24 hours:\n{link}\n\nIf it wasn't you, ignore this email.", ct);
    }

    /// <summary>Sent to the NEW address: the change only happens when its owner follows the link.</summary>
    public async Task SendEmailChangeAsync(AppUser user, string newEmail, CancellationToken ct = default)
    {
        var token = Encode(await users.GenerateChangeEmailTokenAsync(user, newEmail));
        var link = $"{BaseUrl}/confirm-email-change?userId={user.Id}&email={Uri.EscapeDataString(newEmail)}&token={token}";
        await sender.SendAsync(newEmail, "Confirm your new Dollars at Work email",
            $"Someone asked to use this address to sign in to Dollars at Work. If it was you, confirm it within 24 hours:\n{link}\n\nIf it wasn't you, ignore this email and nothing will change.", ct);
    }

    public static string Encode(string token) => WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

    public static string? Decode(string? encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded)) return null;
        try { return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(encoded)); }
        catch (FormatException) { return null; }
    }
}
