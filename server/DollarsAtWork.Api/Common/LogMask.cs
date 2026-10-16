using System.Text.RegularExpressions;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Keeps email addresses out of the logs (which Sentry and the host can see): enough is left to tell two apart when
/// fixing a problem, never enough to read the address. "hannah@example.com" becomes "h***@e***.com".
/// </summary>
public static partial class LogMask
{
    public static string Email(string? address)
    {
        if (string.IsNullOrWhiteSpace(address)) return "(none)";
        var at = address.LastIndexOf('@');
        if (at <= 0 || at == address.Length - 1) return "***";

        var domain = address[(at + 1)..];
        var dot = domain.LastIndexOf('.');
        var suffix = dot > 0 ? domain[dot..] : "";
        return $"{address[0]}***@{domain[0]}***{suffix}";
    }

    /// <summary>Masks every address inside free text, such as an error body from the email provider.</summary>
    public static string Emails(string? text) =>
        string.IsNullOrEmpty(text) ? "" : AddressPattern().Replace(text, m => Email(m.Value));

    [GeneratedRegex(@"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")]
    private static partial Regex AddressPattern();
}
