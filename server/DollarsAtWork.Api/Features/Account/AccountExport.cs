using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using DollarsAtWork.Api.Features.Scenarios;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Account;

/// <summary>Everything a user has entered, as one JSON file or as a zip of CSV files (one per list).</summary>
public class AccountExport(AppDbContext db, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    public async Task<byte[]> ToJsonAsync(AppUser user, CancellationToken ct) =>
        JsonSerializer.SerializeToUtf8Bytes(await LoadAsync(user, ct), Json);

    public async Task<byte[]> ToCsvZipAsync(AppUser user, CancellationToken ct)
    {
        var data = await LoadAsync(user, ct);
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            Add(zip, "account.csv", ["Email", "Created", "Subscription", "TrialEnds", "Exported"],
                [[data.Account.Email, data.Account.CreatedAt, data.Account.SubscriptionStatus, data.Account.TrialEndsAt, data.ExportedAt]]);
            Add(zip, "plan.csv", ["MonthlyIncome", "Currency", "DebtStrategy", "SavingsSplitMode", "DebtDoneDestination", "SavingsDoneDestination", "InflationRate", "IncomeGrowthRate", "RaiseToInvestments", "BirthYear", "RetirementAge", "RetirementSpendingMonthly", "RetirementIncomeMonthly"],
                [[data.Plan.MonthlyIncome, data.Plan.Currency, data.Plan.DebtStrategy, data.Plan.SavingsSplitMode, data.Plan.DebtDoneDestination, data.Plan.SavingsDoneDestination, data.Plan.InflationRate, data.Plan.IncomeGrowthRate, data.Plan.RaiseToInvestments, data.Plan.BirthYear, data.Plan.RetirementAge, data.Plan.RetirementSpendingMonthly, data.Plan.RetirementIncomeMonthly]]);
            Add(zip, "income-sources.csv", ["Name", "Amount", "Frequency", "MonthlyAmount"], data.IncomeSources.Select(i => new object?[] { i.Name, i.Amount, i.Frequency, i.MonthlyAmount }));
            Add(zip, "categories.csv", ["Name", "Kind", "Amount", "Order"], data.Categories.Select(c => new object?[] { c.Name, c.Kind, c.Amount, c.SortOrder }));
            Add(zip, "savings-goals.csv", ["Name", "Target", "Balance", "TargetDate", "Apy", "Priority", "SharePercent", "RepeatMonths"],
                data.SavingsGoals.Select(g => new object?[] { g.Name, g.TargetAmount, g.CurrentBalance, g.TargetDate, g.Apy, g.Priority, g.SharePercent, g.RepeatMonths }));
            Add(zip, "debts.csv", ["Name", "Type", "Balance", "Apr", "MinimumPayment", "MinimumOnly", "PromoApr", "PromoEndsMonth", "Order"],
                data.Debts.Select(d => new object?[] { d.Name, d.Type, d.Balance, d.Apr, d.MinPayment, d.MinimumOnly, d.PromoApr, YearMonth(d.PromoEndsMonth), d.SortOrder }));
            Add(zip, "investment-accounts.csv", ["Name", "Type", "Balance", "ExpectedReturn", "SharePercent", "MatchPercent", "MatchLimitPercent", "MatchSalaryYearly", "PayrollMonthly"],
                data.InvestmentAccounts.Select(a => new object?[] { a.Name, a.Type, a.Balance, a.ExpectedReturn, a.SharePercent, a.MatchPercent, a.MatchLimitPercent, a.MatchSalaryYearly, a.PayrollMonthly }));
            Add(zip, "other-items.csv", ["Name", "Kind", "Type", "Value", "YearlyChangePercent"], data.OtherItems.Select(i => new object?[] { i.Name, i.Kind, i.Type, i.Value, i.YearlyChangePercent }));
            Add(zip, "one-time-amounts.csv", ["Name", "Amount", "Month", "GoesTo"], data.Windfalls.Select(w => new object?[] { w.Name, w.Amount, YearMonth(w.Month), w.Destination }));
            Add(zip, "net-worth-history.csv", ["Date", "Assets", "Liabilities", "NetWorth", "Savings", "Investments", "Debts"],
                data.NetWorthHistory.Select(s => new object?[] { s.Date, s.Assets, s.Liabilities, s.NetWorth, s.Savings, s.Investments, s.Debts }));
            Add(zip, "scenarios.csv", ["Name", "Changes"], data.Scenarios.Select(s => new object?[] { s.Name, JsonSerializer.Serialize(s.Changes, Json) }));
        }
        return stream.ToArray();
    }

    private async Task<ExportData> LoadAsync(AppUser user, CancellationToken ct)
    {
        var id = user.Id;
        var now = clock.GetUtcNow();
        var plan = await db.Plans.AsNoTracking().SingleAsync(p => p.UserId == id, ct);
        var subscription = await db.Subscriptions.AsNoTracking().SingleAsync(s => s.UserId == id, ct);

        return new ExportData(
            now,
            new ExportAccount(user.Email!, user.CreatedAt, subscription.EffectiveStatus(now), subscription.TrialEndsAt),
            new ExportPlan(plan.MonthlyIncome, plan.Currency, plan.DebtStrategy, plan.SavingsSplitMode, plan.DebtDoneDestination, plan.SavingsDoneDestination, plan.InflationRate, plan.IncomeGrowthRate, plan.RaiseToInvestments, plan.BirthYear, plan.RetirementAge, plan.RetirementSpendingMonthly, plan.RetirementIncomeMonthly),
            (await db.IncomeSources.AsNoTracking().Where(i => i.UserId == id).OrderBy(i => i.SortOrder).ToListAsync(ct))
                .Select(i => new ExportIncomeSource(i.Name, i.Amount, i.Frequency, Math.Round(i.MonthlyAmount, 2))).ToList(),
            await db.Categories.AsNoTracking().Where(c => c.UserId == id).OrderBy(c => c.SortOrder)
                .Select(c => new ExportCategory(c.Name, c.Kind, c.Amount, c.SortOrder)).ToListAsync(ct),
            await db.SavingsGoals.AsNoTracking().Where(g => g.UserId == id).OrderBy(g => g.Priority)
                .Select(g => new ExportGoal(g.Name, g.TargetAmount, g.CurrentBalance, g.TargetDate, g.Apy, g.Priority, g.SharePercent, g.RepeatMonths)).ToListAsync(ct),
            await db.Debts.AsNoTracking().Where(d => d.UserId == id).OrderBy(d => d.SortOrder)
                .Select(d => new ExportDebt(d.Name, d.Type, d.Balance, d.Apr, d.MinPayment, d.MinimumOnly, d.PromoApr, d.PromoEndsMonth, d.SortOrder)).ToListAsync(ct),
            await db.InvestmentAccounts.AsNoTracking().Where(a => a.UserId == id).OrderBy(a => a.SortOrder)
                .Select(a => new ExportInvestmentAccount(a.Name, a.Type, a.Balance, a.ExpectedReturn, a.SharePercent, a.MatchPercent, a.MatchLimitPercent, a.MatchSalaryYearly, a.PayrollMonthly)).ToListAsync(ct),
            await db.OtherItems.AsNoTracking().Where(i => i.UserId == id).OrderBy(i => i.SortOrder)
                .Select(i => new ExportOtherItem(i.Name, i.Kind, i.Type, i.Value, i.YearlyChangePercent)).ToListAsync(ct),
            await db.Windfalls.AsNoTracking().Where(w => w.UserId == id).OrderBy(w => w.Month)
                .Select(w => new ExportWindfall(w.Name, w.Amount, w.Month, w.Destination)).ToListAsync(ct),
            await db.NetWorthSnapshots.AsNoTracking().Where(s => s.UserId == id).OrderBy(s => s.Date)
                .Select(s => new ExportSnapshot(s.Date, s.Assets, s.Liabilities, s.NetWorth, s.Savings, s.Investments, s.Debts)).ToListAsync(ct),
            (await db.Scenarios.AsNoTracking().Where(s => s.UserId == id).OrderBy(s => s.SortOrder)
                .Select(s => new { s.Name, s.OverridesJson }).ToListAsync(ct))
                .Select(s => new ExportScenario(s.Name, ScenarioJson.Read(s.OverridesJson))).ToList());
    }

    private static void Add(ZipArchive zip, string name, string[] header, IEnumerable<object?[]> rows)
    {
        using var writer = new StreamWriter(zip.CreateEntry(name).Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
        writer.WriteLine(string.Join(',', header));
        foreach (var row in rows)
            writer.WriteLine(string.Join(',', row.Select(Cell)));
    }

    /// <summary>A month field ("2027-06"): stored as its first day, but it means the whole month.</summary>
    private static string? YearMonth(DateOnly? month) => month?.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    private static string Cell(object? value)
    {
        var text = value switch
        {
            null => "",
            DateTimeOffset moment => moment.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
            DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            IFormattable number => number.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? "",
        };

        // A name starting with = + - or @ would run as a formula when the file is opened in a spreadsheet.
        if (value is string && text.Length > 0 && "=+-@\t\r".Contains(text[0]))
            text = "'" + text;

        return text.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? $"\"{text.Replace("\"", "\"\"")}\"" : text;
    }

    private record ExportData(
        DateTimeOffset ExportedAt,
        ExportAccount Account,
        ExportPlan Plan,
        List<ExportIncomeSource> IncomeSources,
        List<ExportCategory> Categories,
        List<ExportGoal> SavingsGoals,
        List<ExportDebt> Debts,
        List<ExportInvestmentAccount> InvestmentAccounts,
        List<ExportOtherItem> OtherItems,
        List<ExportWindfall> Windfalls,
        List<ExportSnapshot> NetWorthHistory,
        List<ExportScenario> Scenarios);

    private record ExportAccount(string Email, DateTimeOffset CreatedAt, SubscriptionStatus SubscriptionStatus, DateTimeOffset TrialEndsAt);
    private record ExportPlan(decimal MonthlyIncome, string Currency, DebtStrategy DebtStrategy, SavingsSplitMode SavingsSplitMode, FreedMoneyDestination DebtDoneDestination, FreedMoneyDestination SavingsDoneDestination, decimal InflationRate, decimal IncomeGrowthRate, bool RaiseToInvestments, int? BirthYear, int? RetirementAge, decimal? RetirementSpendingMonthly, decimal? RetirementIncomeMonthly);
    private record ExportIncomeSource(string Name, decimal Amount, IncomeFrequency Frequency, decimal MonthlyAmount);
    private record ExportCategory(string Name, CategoryKind Kind, decimal Amount, int SortOrder);
    private record ExportGoal(string Name, decimal TargetAmount, decimal CurrentBalance, DateOnly? TargetDate, decimal Apy, int Priority, decimal SharePercent, int? RepeatMonths);
    private record ExportDebt(string Name, DebtType Type, decimal Balance, decimal Apr, decimal MinPayment, bool MinimumOnly, decimal? PromoApr, DateOnly? PromoEndsMonth, int SortOrder);
    private record ExportInvestmentAccount(string Name, InvestmentAccountType Type, decimal Balance, decimal ExpectedReturn, decimal SharePercent, decimal? MatchPercent, decimal? MatchLimitPercent, decimal? MatchSalaryYearly, decimal PayrollMonthly);
    private record ExportOtherItem(string Name, OtherItemKind Kind, OtherItemType Type, decimal Value, decimal YearlyChangePercent);
    private record ExportWindfall(string Name, decimal Amount, DateOnly Month, WindfallDestination Destination);
    private record ExportScenario(string Name, ScenarioOverrides Changes);
    private record ExportSnapshot(DateOnly Date, decimal Assets, decimal Liabilities, decimal NetWorth, decimal? Savings, decimal? Investments, decimal? Debts);
}
