namespace DollarsAtWork.Api.Features.Account;

public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

/// <summary>Asks for a confirmation link to be sent to the new address. Nothing changes until that link is used.</summary>
public record ChangeEmailRequest(string? NewEmail, string? CurrentPassword);

public record ConfirmEmailChangeRequest(Guid UserId, string? Email, string? Token);

/// <summary>The password is asked for again so a forgotten, unlocked laptop can't delete an account.</summary>
public record DeleteAccountRequest(string? Password);

/// <summary>
/// The person's own forward-looking numbers for the hour-1 welcome email, worked out by the browser
/// (the projection engine lives there). Either may be missing.
/// </summary>
public record WelcomeEmailRequest(int? DebtFreeMonth, decimal? NetWorthIn10Years);
