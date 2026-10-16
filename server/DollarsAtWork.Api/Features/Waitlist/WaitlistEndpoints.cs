using System.Net.Mail;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Waitlist;

/// <summary>
/// "Tell me when you launch": open to anyone, no account. The answer is the same whether or not the address
/// was already on the list, so the form can't be used to find out who signed up.
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

    private static async Task<IResult> Join(JoinWaitlistRequest request, AppDbContext db, TimeProvider clock, CancellationToken ct)
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

        if (!await db.WaitlistEntries.AnyAsync(w => w.Email == email, ct))
        {
            db.WaitlistEntries.Add(new WaitlistEntry { Id = Guid.NewGuid(), Email = email!, Source = source, Note = note, CreatedAt = clock.GetUtcNow() });
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // The same address arrived twice at once; the unique index kept one. Same answer either way.
            }
        }

        return Results.NoContent();
    }

    private static string? NormalizeEmail(string? email)
    {
        var trimmed = email?.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length > 254) return null;
        return MailAddress.TryCreate(trimmed, out var address) && address.Address == trimmed ? trimmed.ToLowerInvariant() : null;
    }
}
