using System.Net.Mail;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Features.Waitlist;

/// <summary>
/// "Tell me when you launch": open to anyone, no account. The answer is the same whether or not the address
/// was already on the list, so the form can't be used to find out who signed up.
/// An affiliate link request (source "affiliates") is also emailed to the support inbox, because Hannah sends each
/// link by hand and nothing else would tell her a request came in. An address already on the list gets its source
/// and note updated rather than dropped, so a money-note subscriber who later asks for a link isn't lost.
/// </summary>
public static class WaitlistEndpoints
{
    /// <summary>The pages that show the form. Anything else is stored as "other".</summary>
    private static readonly HashSet<string> Sources = ["home", "tools", "demo", "pricing", "help", "blog", "affiliates", "other"];
    private const int MaxNoteLength = 200;

    public static RouteGroupBuilder MapWaitlistEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/waitlist", Join).WithTags("Waitlist").AllowAnonymous().RequireRateLimiting(RateLimits.PublicForm);
        return api;
    }

    private static async Task<IResult> Join(
        JoinWaitlistRequest request,
        AppDbContext db,
        TimeProvider clock,
        IAppEmailSender sender,
        IOptions<AppOptions> options,
        ILoggerFactory loggers,
        CancellationToken ct)
    {
        var check = new Validation();
        var email = NormalizeEmail(request.Email);
        if (email is null)
            check.Add("email", "Enter a valid email address.");

        var note = request.Note?.Trim();
        if (string.IsNullOrEmpty(note))
            note = null;
        else if (note.Length > MaxNoteLength)
            check.Add("note", $"Keep it to {MaxNoteLength} characters or fewer.");

        if (check.Failed)
            return check.ToResult();

        var source = request.Source?.Trim().ToLowerInvariant() ?? "";
        if (!Sources.Contains(source))
            source = "other";

        var now = clock.GetUtcNow();
        var isAffiliate = source == "affiliates";
        var existing = await db.WaitlistEntries.FirstOrDefaultAsync(w => w.Email == email, ct);
        if (existing is null)
        {
            db.WaitlistEntries.Add(new WaitlistEntry { Id = Guid.NewGuid(), Email = email!, Source = source, Note = note, CreatedAt = now });
        }
        else if (isAffiliate)
        {
            // Asking for a link is the newer, stronger signal: keep the original date, take the new source and note.
            existing.Source = source;
            existing.Note = note ?? existing.Note;
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The same address arrived twice at once; the unique index kept one. Same answer either way.
        }

        if (isAffiliate)
            await NotifyOwnerAsync(email!, note, existing is not null, now, sender, options.Value.PublicUrl, loggers, ct);

        return Results.NoContent();
    }

    /// <summary>
    /// Emails the request to the support inbox. A failed send is logged, not shown: the request is already saved, and
    /// the person's answer must not change (the form never reveals anything).
    /// </summary>
    private static async Task NotifyOwnerAsync(
        string email,
        string? note,
        bool wasOnList,
        DateTimeOffset at,
        IAppEmailSender sender,
        string appUrl,
        ILoggerFactory loggers,
        CancellationToken ct)
    {
        var message = AffiliateRequestEmail(email, note, wasOnList, at, appUrl);
        try
        {
            await sender.SendAsync(EmailLayout.SupportAddress, message, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            loggers.CreateLogger("Waitlist").LogError(ex, "Couldn't email the affiliate link request from {Email}", LogMask.Email(email));
        }
    }

    internal static EmailMessage AffiliateRequestEmail(string email, string? note, bool wasOnList, DateTimeOffset at, string appUrl)
    {
        var rows = new List<EmailLayout.Row>
        {
            new("Email", email),
            new("Who and where", note ?? "(left blank)"),
            new("Asked", EmailDates.Moment(at)),
        };
        if (wasOnList)
            rows.Add(new("Note", "This address was already on the list; its source is now affiliates."));

        // The name goes in the subject; it is typed by a stranger, so keep it to one short line of printable text.
        var who = new string((note?.Split(" — ")[0] ?? "").Where(c => !char.IsControl(c)).Take(60).ToArray()).Trim();
        var subject = who.Length == 0 ? "Affiliate link request" : $"Affiliate link request: {who}";
        var site = appUrl.TrimEnd('/');
        return new EmailLayout(appUrl)
            .Preheader("Someone asked for an affiliate link on /affiliates.")
            .Heading("New affiliate link request")
            .Paragraph("Someone filled in the box on the affiliates page. The page told them you'd email their link within two days.")
            .Rows("The request", rows)
            .Paragraph($"Reply to them at the address above with their link ({site}/?from=their-name) and a code for their free account.")
            .FooterNote("Sent to the support inbox because someone asked for an affiliate link on dollarsatwork.app.")
            .Build(subject);
    }

    private static string? NormalizeEmail(string? email)
    {
        var trimmed = email?.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length > 254) return null;
        return MailAddress.TryCreate(trimmed, out var address) && address.Address == trimmed ? trimmed.ToLowerInvariant() : null;
    }
}
