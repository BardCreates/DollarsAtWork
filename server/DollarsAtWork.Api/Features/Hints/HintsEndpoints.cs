using System.Security.Claims;
using System.Text.RegularExpressions;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace DollarsAtWork.Api.Features.Hints;

/// <summary>
/// The first-time hints shown around the app: close one, turn them all off, or turn them back on.
/// These are display preferences, not plan data, so they stay open to expired (read-only) accounts.
/// </summary>
public static partial class HintsEndpoints
{
    public static RouteGroupBuilder MapHintsEndpoints(this RouteGroupBuilder api)
    {
        var hints = api.MapGroup("/hints").WithTags("Hints").RequireAuthorization();

        hints.MapPost("/dismiss", Dismiss);
        hints.MapPut("/", Update);

        return api;
    }

    private static async Task<IResult> Dismiss(DismissHintRequest request, ClaimsPrincipal principal, UserManager<AppUser> users)
    {
        var id = request.Id?.Trim() ?? "";
        if (!HintIds.IsValid(id))
        {
            var check = new Validation();
            check.Add("id", "That isn't a hint.");
            return check.ToResult();
        }

        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        var dismissed = HintIds.Parse(user.DismissedHints);
        if (!dismissed.Contains(id))
        {
            dismissed.Add(id);
            user.DismissedHints = HintIds.Join(dismissed);
            await users.UpdateAsync(user);
        }

        return Results.Ok(HintIds.ToResponse(user));
    }

    /// <summary>Turning hints off hides all of them. Turning them back on shows every hint again from the start.</summary>
    private static async Task<IResult> Update(HintSettingsRequest request, ClaimsPrincipal principal, UserManager<AppUser> users)
    {
        if (request.Off is not { } off)
        {
            var check = new Validation();
            check.Add("off", "Say whether hints are on or off.");
            return check.ToResult();
        }

        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        user.HintsOff = off;
        if (!off)
            user.DismissedHints = "";
        await users.UpdateAsync(user);

        return Results.Ok(HintIds.ToResponse(user));
    }
}

/// <summary>Reading and writing the comma-separated list of closed hints.</summary>
public static partial class HintIds
{
    /// <summary>Room for every hint the app has, with plenty to spare; the column holds 1,000 characters.</summary>
    private const int MaxStored = 40;

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{0,39}$")]
    private static partial Regex Pattern();

    public static bool IsValid(string id) => Pattern().IsMatch(id);

    public static List<string> Parse(string stored) =>
        stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Where(IsValid).Distinct().ToList();

    /// <summary>Keeps the newest entries if the list ever outgrows the column.</summary>
    public static string Join(List<string> ids) => string.Join(',', ids.TakeLast(MaxStored));

    public static HintsResponse ToResponse(AppUser user) => new(user.HintsOff, Parse(user.DismissedHints));
}
