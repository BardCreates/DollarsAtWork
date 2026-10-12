using DollarsAtWork.Api.Domain;

namespace DollarsAtWork.Api.Features.Auth;

public record RegisterRequest(string? Email, string? Password);

public record LoginRequest(string? Email, string? Password, bool RememberMe = true);

public record ForgotPasswordRequest(string? Email);

public record ResetPasswordRequest(string? Email, string? Token, string? NewPassword);

public record ConfirmEmailRequest(Guid UserId, string? Token);

public record AccessResponse(
    string Status,
    bool HasFullAccess,
    DateTimeOffset TrialEndsAt,
    int TrialDaysLeft,
    DateTimeOffset? CurrentPeriodEnd)
{
    public static AccessResponse From(Subscription s, DateTimeOffset now)
    {
        var daysLeft = (int)Math.Ceiling((s.TrialEndsAt - now).TotalDays);
        return new AccessResponse(
            s.EffectiveStatus(now).ToString(),
            s.HasFullAccess(now),
            s.TrialEndsAt,
            Math.Max(0, daysLeft),
            s.CurrentPeriodEnd);
    }
}

public record MeResponse(Guid Id, string Email, bool EmailConfirmed, AccessResponse Access);
