namespace DollarsAtWork.Api.Features.Hints;

public record DismissHintRequest(string? Id);

public record HintSettingsRequest(bool? Off);

/// <summary>First-time hint settings, sent with the signed-in user so pages know which hints to show.</summary>
public record HintsResponse(bool Off, IReadOnlyList<string> Dismissed);
