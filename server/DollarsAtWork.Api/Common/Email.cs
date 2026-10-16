using System.Text;
using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;

namespace DollarsAtWork.Api.Common;

public interface IAppEmailSender
{
    Task SendAsync(string to, EmailMessage message, CancellationToken ct = default);
}

/// <summary>
/// Development sender: writes emails to the console log instead of sending them.
/// Program.cs uses it whenever Email:ResendApiKey is not set.
/// </summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IAppEmailSender
{
    public Task SendAsync(string to, EmailMessage message, CancellationToken ct = default)
    {
        // The plain-text version reads well in a console; the HTML version is the same content.
        logger.LogInformation("EMAIL to {To}\nSubject: {Subject}\n{Body}", to, message.Subject, message.Text);
        return Task.CompletedTask;
    }
}

public class EmailOptions
{
    /// <summary>The From header, e.g. "Dollars at Work &lt;hello@dollarsatwork.com&gt;". The domain must be verified in Resend.</summary>
    public string From { get; set; } = "Dollars at Work <hello@example.com>";

    /// <summary>Resend API key. Keep it in user secrets or the host's app settings, never in the repo.</summary>
    public string? ResendApiKey { get; set; }
}

/// <summary>
/// Production sender: Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
/// Sends the branded HTML with the plain-text version alongside for clients that prefer it. A failed send throws, so the caller's
/// request fails loudly instead of silently losing a reset link.
/// </summary>
public class ResendEmailSender(
    HttpClient http,
    Microsoft.Extensions.Options.IOptions<EmailOptions> options,
    ILogger<ResendEmailSender> logger) : IAppEmailSender
{
    public async Task SendAsync(string to, EmailMessage message, CancellationToken ct = default)
    {
        var settings = options.Value;
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", settings.ResendApiKey);
        request.Content = JsonContent.Create(new
        {
            from = settings.From,
            to = new[] { to },
            subject = message.Subject,
            text = message.Text,
            html = message.Html,
        });

        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Resend rejected an email to {To} ({Status}): {Detail}", to, (int)response.StatusCode, detail);
            throw new InvalidOperationException($"Email provider returned {(int)response.StatusCode}.");
        }
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
        var message = new EmailLayout(BaseUrl)
            .Preheader("One tap and you're in. Then it's time to put your dollars to work.")
            .Heading("Welcome to Dollars at Work")
            .Paragraph("We're glad you're here. Dollars at Work gives every dollar of your income a job, then shows you where this month's plan can take you: your debt-free date, your savings goals and your net worth years from now.")
            .Paragraph("First, confirm this is your email address.")
            .Button("Confirm my email", link)
            .Small("This link works for 24 hours. If you didn't sign up, you can ignore this email.")
            .FooterNote("You're getting this because this address was used to sign up for Dollars at Work.")
            .Build("Confirm your email for Dollars at Work");
        await sender.SendAsync(user.Email!, message, ct);
    }

    public async Task SendPasswordResetAsync(AppUser user, CancellationToken ct = default)
    {
        var token = Encode(await users.GeneratePasswordResetTokenAsync(user));
        var link = $"{BaseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={token}";
        var message = new EmailLayout(BaseUrl)
            .Preheader("Choose a new password. The link works for 24 hours.")
            .Heading("Reset your password")
            .Paragraph("We got a request to reset the password for your Dollars at Work account. If that was you, choose a new one below.")
            .Button("Choose a new password", link)
            .Small("This link works for 24 hours. Didn't ask for this? You can ignore this email and your password stays the same.")
            .FooterNote("You're getting this because a password reset was requested for this account.")
            .Build("Reset your Dollars at Work password");
        await sender.SendAsync(user.Email!, message, ct);
    }

    /// <summary>Sent to the NEW address: the change only happens when its owner follows the link.</summary>
    public async Task SendEmailChangeAsync(AppUser user, string newEmail, CancellationToken ct = default)
    {
        var token = Encode(await users.GenerateChangeEmailTokenAsync(user, newEmail));
        var link = $"{BaseUrl}/confirm-email-change?userId={user.Id}&email={Uri.EscapeDataString(newEmail)}&token={token}";
        var message = new EmailLayout(BaseUrl)
            .Preheader("Confirm this address to start signing in with it.")
            .Heading("Confirm your new email")
            .Paragraph("Someone asked to use this address to sign in to Dollars at Work. If that was you, confirm it below and we'll switch your account over.")
            .Button("Confirm new email", link)
            .Small("This link works for 24 hours. If it wasn't you, ignore this email and nothing will change.")
            .FooterNote("You're getting this because this address was entered as a new sign-in email.")
            .Build("Confirm your new Dollars at Work email");
        await sender.SendAsync(newEmail, message, ct);
    }

    public static string Encode(string token) => WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

    public static string? Decode(string? encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded)) return null;
        try { return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(encoded)); }
        catch (FormatException) { return null; }
    }
}
