using System.Globalization;
using DollarsAtWork.Api.Common;
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

    public static EmailMessage Compose(
        NetWorthSnapshot latest,
        NetWorthSnapshot? previous,
        ReportEmailRequest request,
        DateTimeOffset now,
        string appUrl)
    {
        var month = Month(latest.Date);
        decimal? change = previous is null ? null : Math.Round(latest.NetWorth - previous.NetWorth, 0, MidpointRounding.AwayFromZero);
        var caption = previous is null
            ? "This is your starting point. Next month you'll see how far you've come."
            : $"That's {Change(latest.NetWorth - previous.NetWorth, "up", "down")} since {Month(previous.Date)}.";

        // Only areas the snapshot recorded; older snapshots predate the breakdown.
        var areas = new List<EmailLayout.Row>();
        void Area(string label, decimal? value, decimal? before, string up, string down, bool lowerIsBetter = false)
        {
            if (value is null) return;
            string? note = null;
            var tone = EmailLayout.Tone.Plain;
            if (before is not null)
            {
                var delta = Math.Round(value.Value - before.Value, 0, MidpointRounding.AwayFromZero);
                note = Change(delta, up, down);
                if (delta != 0) tone = (delta < 0) == lowerIsBetter ? EmailLayout.Tone.Good : EmailLayout.Tone.Plain;
            }
            areas.Add(new EmailLayout.Row(label, Money(value.Value), note, tone));
        }
        Area("Savings", latest.Savings, previous?.Savings, "up", "down");
        Area("Investments", latest.Investments, previous?.Investments, "up", "down");
        Area("Debt", latest.Debts, previous?.Debts, "up", "paid down by", lowerIsBetter: true);

        var ahead = new List<EmailLayout.Row>();
        if (request.DebtFreeMonth is { } months and > 0)
            ahead.Add(new EmailLayout.Row("Debt-free", Month(DateOnly.FromDateTime(now.UtcDateTime.AddMonths(months)))));
        if (request.NetWorthIn10Years is { } ten)
            ahead.Add(new EmailLayout.Row("Net worth in 10 years", $"about {Money(ten)}"));

        var opener = change switch
        {
            null => "Nice work doing your first check-in. Here's where things stand.",
            > 0 => "Your plan is moving. Here's where things stand this month.",
            _ => "Every check-in keeps your plan honest. Here's where things stand this month.",
        };

        return new EmailLayout(appUrl)
            .Preheader($"Net worth: {Money(latest.NetWorth)}. {caption}")
            .Heading($"Your {month} check-in")
            .Paragraph(opener)
            .Figure("Net worth", Money(latest.NetWorth), caption)
            .Rows("Where it stands", areas)
            .Rows("Where you're headed", ahead)
            .Button("See the full picture", appUrl)
            .Small("Estimates are based on your plan and assumed returns. They're not financial advice.")
            .FooterNote("You're getting this because you asked for a copy of your check-in.")
            .Build($"Your Dollars at Work check-in for {month}");
    }
}
