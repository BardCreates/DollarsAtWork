namespace DollarsAtWork.Api.Common;

/// <summary>
/// Collects field errors for a request. Keys are camelCase field names, as the client expects.
/// Each check returns the cleaned value, or the fallback after recording what was wrong.
/// </summary>
public class Validation
{
    public const decimal MaxAmount = 999_999_999.99m;
    public const int MaxNameLength = 60;

    public Dictionary<string, string[]> Errors { get; } = [];
    public bool Failed => Errors.Count > 0;

    public IResult ToResult() => Results.ValidationProblem(Errors);

    public void Add(string field, string message) => Errors[field] = [message];

    public string Name(string field, string? value, string what = "name")
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            Add(field, $"Enter a {what}.");
        else if (trimmed.Length > MaxNameLength)
            Add(field, $"Keep the {what} to {MaxNameLength} characters or fewer.");
        return trimmed ?? "";
    }

    /// <summary>Dollars from $0 to $999,999,999.99.</summary>
    public decimal Amount(string field, decimal? value, string what)
    {
        if (value is not { } amount || amount < 0 || amount > MaxAmount)
            Add(field, $"Enter {what} between $0 and $999,999,999.");
        return value ?? 0m;
    }

    /// <summary>A percent between two bounds, such as an APR.</summary>
    public decimal Percent(string field, decimal? value, string what, decimal max = 100m)
    {
        if (value is not { } percent || percent < 0 || percent > max)
            Add(field, $"Enter {what} between 0% and {max:0.##}%.");
        return value ?? 0m;
    }

    /// <summary>A percent that may be negative, such as a yearly change in value: from -max to +max.</summary>
    public decimal SignedPercent(string field, decimal? value, string what, decimal max)
    {
        if (value is not { } percent || percent < -max || percent > max)
            Add(field, $"Enter {what} between -{max:0.##}% and {max:0.##}%.");
        return value ?? 0m;
    }

    public TEnum Enum<TEnum>(string field, string? value, string message) where TEnum : struct, Enum
    {
        // Names only: "2" must not slip through as a valid enum value.
        if (value is not null && !int.TryParse(value, out _) && System.Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) && System.Enum.IsDefined(parsed))
            return parsed;
        Add(field, message);
        return default;
    }
}
