using DollarsAtWork.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Common;

public static class FullAccess
{
    /// <summary>
    /// For endpoints that create or change data. Expired accounts stay signed in and can read,
    /// but get a 403 here.
    /// </summary>
    public static RouteHandlerBuilder RequireFullAccess(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(CheckAsync);

    private static async ValueTask<object?> CheckAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var db = http.RequestServices.GetRequiredService<AppDbContext>();
        var clock = http.RequestServices.GetRequiredService<TimeProvider>();
        var userId = http.User.GetUserId();

        var subscription = await db.Subscriptions.AsNoTracking()
            .SingleOrDefaultAsync(s => s.UserId == userId, http.RequestAborted);

        if (subscription is null || !subscription.HasFullAccess(clock.GetUtcNow()))
            return Results.Problem(
                title: "Editing is turned off.",
                detail: "Your access has ended, but nothing's lost. Subscribe to start editing again.",
                statusCode: StatusCodes.Status403Forbidden);

        return await next(context);
    }
}
