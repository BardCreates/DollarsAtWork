namespace DollarsAtWork.Api.Features.Waitlist;

/// <param name="Note">Optional, up to 200 characters. The affiliates page sends "name — where they share".</param>
public record JoinWaitlistRequest(string? Email, string? Source, string? Note = null);
