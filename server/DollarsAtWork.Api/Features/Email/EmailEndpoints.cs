using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Features.Email;

public static class EmailEndpoints
{
    public static RouteGroupBuilder MapEmailEndpoints(this RouteGroupBuilder api)
    {
        var email = api.MapGroup("/email").WithTags("Email");

        // Anonymous on purpose: the sealed token in the link is the proof. Mail apps POST here for one-click
        // unsubscribe (List-Unsubscribe-Post), and the /unsubscribe page POSTs here when its button is pressed.
        email.MapPost("/unsubscribe", Unsubscribe).AllowAnonymous().RequireRateLimiting(RateLimits.Usage); // roomier: one-click requests all come from a few mail servers

        return api;
    }

    /// <summary>Turns off the onboarding emails for the account in the token. Doing it twice is fine.</summary>
    private static async Task<IResult> Unsubscribe(HttpRequest request, EmailUnsubscribe unsubscribe, AppDbContext db, CancellationToken ct)
    {
        var userId = unsubscribe.Read(request.Query["token"]);
        if (userId is null)
            return Results.Problem(title: "This unsubscribe link isn't valid.", detail: "Reply to any of our emails and we'll take you off by hand.", statusCode: StatusCodes.Status400BadRequest);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);
        // An account deleted since the email went out has nothing left to unsubscribe; that's still a success.
        if (user is not null && !user.OnboardingEmailsOff)
        {
            user.OnboardingEmailsOff = true;
            await db.SaveChangesAsync(ct);
        }
        return Results.NoContent();
    }
}
