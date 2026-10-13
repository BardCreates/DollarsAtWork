using System.Globalization;
using System.Text;
using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.NetWorth;

/// <summary>The few forward-looking numbers only the browser can work out (the projection engine lives there).</summary>
public record ReportEmailRequest(int? DebtFreeMonth, decimal? NetWorthIn10Years);

/// <summary>Writes the monthly check-in recap as a plain-text email, from the snapshots on record.</summary>
public static class ReportEmail
{
    public const int MaxMonths = 600;
    public const decimal MaxNetWorth = 1_000_000_000_000m;

    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    private static string Money(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero).ToString("$#,##0;-$#,##0", Invariant);

    private static string Change(decimal change, string up, string down)
    {
        var rounded = Math.Round(change, 0, MidpointRounding.AwayFromZero);
        return rounded > 0 ? $"{up} {Money(rounded)}" : rounded < 0 ? $"{down} {Money(-rounded)}" : "no change";
    }

    private static string Month(DateOnly date) => date.ToString("MMMM yyyy", Invariant);

    public static (string Subject, string Body) Compose(
        NetWorthSnapshot latest,
        NetWorthSnapshot? previous,
        ReportEmailRequest request,
        DateTimeOffset now,
        string appUrl)
    {
        var body = new StringBuilder();
        body.AppendLine($"Your {Month(latest.Date)} check-in");
        body.AppendLine();
        body.AppendLine($"Net worth: {Money(latest.NetWorth)}");
        if (previous is null)
            body.AppendLine("This is your starting point. Next month you'll see how far you've come.");
        else
            body.AppendLine($"That's {Change(latest.NetWorth - previous.NetWorth, "up", "down")} since {Month(previous.Date)}.");
        body.AppendLine();

        // Only areas the snapshot recorded; older snapshots predate the breakdown.
        void Area(string label, decimal? value, decimal? before, string up, string down)
        {
            if (value is null) return;
            var line = $"  {label}: {Money(value.Value)}";
            if (before is not null) line += $" ({Change(value.Value - before.Value, up, down)})";
            body.AppendLine(line);
        }
        body.AppendLine("Where it stands:");
        Area("Savings", latest.Savings, previous?.Savings, "up", "down");
        Area("Investments", latest.Investments, previous?.Investments, "up", "down");
        Area("Debt", latest.Debts, previous?.Debts, "up", "paid down by");
        body.AppendLine();

        var ahead = new List<string>();
        if (request.DebtFreeMonth is { } months and > 0)
            ahead.Add($"  Debt-free: {Month(DateOnly.FromDateTime(now.UtcDateTime.AddMonths(months)))}");
        if (request.NetWorthIn10Years is { } ten)
            ahead.Add($"  Net worth in 10 years: about {Money(ten)}");
        if (ahead.Count > 0)
        {
            body.AppendLine("Where you're headed:");
            foreach (var line in ahead) body.AppendLine(line);
            body.AppendLine();
        }

        body.AppendLine($"See the full picture: {appUrl}");
        body.AppendLine();
        body.AppendLine("Estimates based on your plan and assumed returns, not financial advice.");

        return ($"Your Dollars at Work check-in for {Month(latest.Date)}", body.ToString());
    }
}
