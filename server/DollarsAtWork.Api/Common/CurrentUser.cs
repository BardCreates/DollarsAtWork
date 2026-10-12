using System.Security.Claims;

namespace DollarsAtWork.Api.Common;

public static class CurrentUser
{
    /// <summary>
    /// The signed-in user's id, taken only from the auth cookie.
    /// Endpoints never accept a user id from the URL or request body.
    /// </summary>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("No signed-in user. Did you forget RequireAuthorization()?");
    }
}
