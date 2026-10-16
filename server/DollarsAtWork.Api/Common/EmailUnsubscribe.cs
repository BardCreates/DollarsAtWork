using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Unsubscribe links for the onboarding emails (Gmail and Yahoo require one on this kind of mail). The token is the
/// user id sealed with ASP.NET Data Protection, so it can't be guessed or edited, and it doesn't expire: a link in a
/// month-old email still works. It only ever turns those emails off; it can't sign anyone in or read anything.
/// </summary>
public class EmailUnsubscribe(IDataProtectionProvider protection, IOptions<AppOptions> options)
{
    private readonly IDataProtector _protector = protection.CreateProtector("DollarsAtWork.EmailUnsubscribe.v1");

    private string BaseUrl => options.Value.PublicUrl.TrimEnd('/');

    public string Token(Guid userId) => _protector.Protect(userId.ToString("N"));

    /// <summary>The user id inside a token, or null when it isn't one of ours.</summary>
    public Guid? Read(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 1000)
            return null;
        try
        {
            return Guid.TryParseExact(_protector.Unprotect(token), "N", out var id) ? id : null;
        }
        catch (CryptographicException)
        {
            return null;
        }
    }

    /// <summary>The footer link: a page that asks before turning the emails off (so a link scanner can't do it).</summary>
    public string PageUrl(Guid userId) => $"{BaseUrl}/unsubscribe?token={Uri.EscapeDataString(Token(userId))}";

    /// <summary>The List-Unsubscribe address mail apps POST to for one-click unsubscribe (RFC 8058).</summary>
    public string OneClickUrl(Guid userId) => $"{BaseUrl}/api/email/unsubscribe?token={Uri.EscapeDataString(Token(userId))}";
}
