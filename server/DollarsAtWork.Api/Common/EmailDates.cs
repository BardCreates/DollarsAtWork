using System.Globalization;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// Dates written into emails, and the calendar day of things the browser did. The server doesn't know where a reader is, so it never writes a bare UTC calendar
/// day (a 9 pm Central sign-up would be told the wrong day): moments are given with a time in one fixed US zone,
/// and month labels the browser already showed are reused as they are.
/// </summary>
public static class EmailDates
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    /// <summary>The zone emails name times in: US Central, where the business is. UTC only if the host has no zone data.</summary>
    public static TimeZoneInfo Zone { get; } = FindZone();

    private static TimeZoneInfo FindZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    private static string ZoneName => Zone == TimeZoneInfo.Utc ? "UTC" : "Central";

    /// <summary>"Tuesday, November 17 at 9:12 pm Central".</summary>
    public static string Moment(DateTimeOffset at)
    {
        var local = TimeZoneInfo.ConvertTime(at, Zone);
        return $"{local.ToString("dddd, MMMM d", Invariant)} at {local.ToString("h:mm tt", Invariant).ToLowerInvariant()} {ZoneName}";
    }

    /// <summary>
    /// "November 2027" for a debt-free date `months` from now. `browserMonth` ("2027-11") is the month the person's
    /// own screen showed, worked out in their time zone; it is used when it is within a month of the server's own
    /// reading (the only way the two can honestly differ), and ignored otherwise.
    /// </summary>
    public static string MonthFromNow(int months, string? browserMonth, DateTimeOffset now)
    {
        var utc = now.UtcDateTime.AddMonths(months);
        var server = new DateOnly(utc.Year, utc.Month, 1);

        if (browserMonth is { Length: 7 }
            && DateOnly.TryParseExact(browserMonth + "-01", "yyyy-MM-dd", Invariant, DateTimeStyles.None, out var shown)
            && Math.Abs((shown.Year - server.Year) * 12 + shown.Month - server.Month) <= 1)
        {
            return shown.ToString("MMMM yyyy", Invariant);
        }

        return server.ToString("MMMM yyyy", Invariant);
    }

    /// <summary>
    /// The calendar day to record for something the browser did "today": its own local date when that is within a day
    /// of UTC's (every real time zone is), otherwise UTC's.
    /// </summary>
    public static DateOnly Today(DateOnly? browserToday, DateTimeOffset now)
    {
        var utcToday = DateOnly.FromDateTime(now.UtcDateTime);
        return browserToday is { } local && Math.Abs(local.DayNumber - utcToday.DayNumber) <= 1 ? local : utcToday;
    }
}
