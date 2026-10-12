namespace DollarsAtWork.Api.Features.Account;

public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

/// <summary>Asks for a confirmation link to be sent to the new address. Nothing changes until that link is used.</summary>
public record ChangeEmailRequest(string? NewEmail, string? CurrentPassword);

public record ConfirmEmailChangeRequest(Guid UserId, string? Email, string? Token);

/// <summary>The password is asked for again so a forgotten, unlocked laptop can't delete an account.</summary>
public record DeleteAccountRequest(string? Password);
