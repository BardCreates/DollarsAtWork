using System.Text.RegularExpressions;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Where a sign-up came from, as sent by the sign-up page ("home", "blog/gas-prices", "tools/payoff").
/// Only a short, plain path is kept; anything else is dropped rather than stored, since the browser can send anything.
/// </summary>
public static partial class SignupSources
{
    [GeneratedRegex("^[a-z0-9][a-z0-9/_-]{0,79}$")]
    private static partial Regex Pattern();

    public static string? Clean(string? source)
    {
        var value = source?.Trim().ToLowerInvariant() ?? "";
        return Pattern().IsMatch(value) ? value : null;
    }
}
