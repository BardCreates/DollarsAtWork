using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
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
            Add(zip, "plan.csv", ["MonthlyIncome", "Currency", "DebtStrategy", "SavingsSplitMode", "DebtDoneDestination", "SavingsDoneDestination", "InflationRate", "IncomeGrowthRate"],
                [[data.Plan.MonthlyIncome, data.Plan.Currency, data.Plan.DebtStrategy, data.Plan.SavingsSplitMode, data.Plan.DebtDoneDestination, data.Plan.SavingsDoneDestination, data.Plan.InflationRate, data.Plan.IncomeGrowthRate]]);
            Add(zip, "categories.csv", ["Name", "Kind", "Amount", "Order"], data.Categories.Select(c => new object?[] { c.Name, c.Kind, c.Amount, c.SortOrder }));
            Add(zip, "savings-goals.csv", ["Name", "Target", "Balance", "TargetDate", "Apy", "Priority", "SharePercent"],
                data.SavingsGoals.Select(g => new object?[] { g.Name, g.TargetAmount, g.CurrentBalance, g.TargetDate, g.Apy, g.Priority, g.SharePercent }));
            Add(zip, "debts.csv", ["Name", "Type", "Balance", "Apr", "MinimumPayment", "Order"],
                data.Debts.Select(d => new object?[] { d.Name, d.Type, d.Balance, d.Apr, d.MinPayment, d.SortOrder }));
            Add(zip, "investment-accounts.csv", ["Name", "Type", "Balance", "ExpectedReturn", "SharePercent", "MatchPercent", "MatchLimitPercent"],
                data.InvestmentAccounts.Select(a => new object?[] { a.Name, a.Type, a.Balance, a.ExpectedReturn, a.SharePercent, a.MatchPercent, a.MatchLimitPercent }));
            Add(zip, "other-items.csv", ["Name", "Kind", "Type", "Value"], data.OtherItems.Select(i => new object?[] { i.Name, i.Kind, i.Type, i.Value }));
            Add(zip, "net-worth-history.csv", ["Date", "Assets", "Liabilities", "NetWorth"],
                data.NetWorthHistory.Select(s => new object?[] { s.Date, s.Assets, s.Liabilities, s.NetWorth }));
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
            new ExportPlan(plan.MonthlyIncome, plan.Currency, plan.DebtStrategy, plan.SavingsSplitMode, plan.DebtDoneDestination, plan.SavingsDoneDestination, plan.InflationRate, plan.IncomeGrowthRate),
            await db.Categories.AsNoTracking().Where(c => c.UserId == id).OrderBy(c => c.SortOrder)
                .Select(c => new ExportCategory(c.Name, c.Kind, c.Amount, c.SortOrder)).ToListAsync(ct),
            await db.SavingsGoals.AsNoTracking().Where(g => g.UserId == id).OrderBy(g => g.Priority)
                .Select(g => new ExportGoal(g.Name, g.TargetAmount, g.CurrentBalance, g.TargetDate, g.Apy, g.Priority, g.SharePercent)).ToListAsync(ct),
            await db.Debts.AsNoTracking().Where(d => d.UserId == id).OrderBy(d => d.SortOrder)
                .Select(d => new ExportDebt(d.Name, d.Type, d.Balance, d.Apr, d.MinPayment, d.SortOrder)).ToListAsync(ct),
            await db.InvestmentAccounts.AsNoTracking().Where(a => a.UserId == id).OrderBy(a => a.SortOrder)
                .Select(a => new ExportInvestmentAccount(a.Name, a.Type, a.Balance, a.ExpectedReturn, a.SharePercent, a.MatchPercent, a.MatchLimitPercent)).ToListAsync(ct),
            await db.OtherItems.AsNoTracking().Where(i => i.UserId == id).OrderBy(i => i.SortOrder)
                .Select(i => new ExportOtherItem(i.Name, i.Kind, i.Type, i.Value)).ToListAsync(ct),
            await db.NetWorthSnapshots.AsNoTracking().Where(s => s.UserId == id).OrderBy(s => s.Date)
                .Select(s => new ExportSnapshot(s.Date, s.Assets, s.Liabilities, s.NetWorth)).ToListAsync(ct));
    }

    private static void Add(ZipArchive zip, string name, string[] header, IEnumerable<object?[]> rows)
    {
        using var writer = new StreamWriter(zip.CreateEntry(name).Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
        writer.WriteLine(string.Join(',', header));
        foreach (var row in rows)
            writer.WriteLine(string.Join(',', row.Select(Cell)));
    }

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
        List<ExportCategory> Categories,
        List<ExportGoal> SavingsGoals,
        List<ExportDebt> Debts,
        List<ExportInvestmentAccount> InvestmentAccounts,
        List<ExportOtherItem> OtherItems,
        List<ExportSnapshot> NetWorthHistory);

    private record ExportAccount(string Email, DateTimeOffset CreatedAt, SubscriptionStatus SubscriptionStatus, DateTimeOffset TrialEndsAt);
    private record ExportPlan(decimal MonthlyIncome, string Currency, DebtStrategy DebtStrategy, SavingsSplitMode SavingsSplitMode, FreedMoneyDestination DebtDoneDestination, FreedMoneyDestination SavingsDoneDestination, decimal InflationRate, decimal IncomeGrowthRate);
    private record ExportCategory(string Name, CategoryKind Kind, decimal Amount, int SortOrder);
    private record ExportGoal(string Name, decimal TargetAmount, decimal CurrentBalance, DateOnly? TargetDate, decimal Apy, int Priority, decimal SharePercent);
    private record ExportDebt(string Name, DebtType Type, decimal Balance, decimal Apr, decimal MinPayment, int SortOrder);
    private record ExportInvestmentAccount(string Name, InvestmentAccountType Type, decimal Balance, decimal ExpectedReturn, decimal SharePercent, decimal? MatchPercent, decimal? MatchLimitPercent);
    private record ExportOtherItem(string Name, OtherItemKind Kind, OtherItemType Type, decimal Value);
    private record ExportSnapshot(DateOnly Date, decimal Assets, decimal Liabilities, decimal NetWorth);
}
