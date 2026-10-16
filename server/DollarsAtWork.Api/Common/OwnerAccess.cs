using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace DollarsAtWork.Api.Common;

/// <summary>
/// The owner is whoever signs in with the email in App:OwnerEmail. With the setting empty, nobody is.
/// </summary>
public static class OwnerAccess
{
    public static bool IsOwner(AppUser user, AppOptions options)
    {
        var owner = options.OwnerEmail.Trim();
        return owner.Length > 0 && string.Equals(user.Email, owner, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// For endpoints only the owner may use. Anyone else gets a 404, the same as a page that doesn't exist,
    /// so there is nothing to find. Use after RequireAuthorization().
    /// </summary>
    public static RouteHandlerBuilder RequireOwner(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(CheckAsync);

    private static async ValueTask<object?> CheckAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var users = http.RequestServices.GetRequiredService<UserManager<AppUser>>();
        var options = http.RequestServices.GetRequiredService<IOptions<AppOptions>>().Value;

        var user = await users.FindByIdAsync(http.User.GetUserId().ToString());
        if (user is null || !IsOwner(user, options))
            return Results.NotFound();

        return await next(context);
    }
}
