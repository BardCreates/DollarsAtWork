namespace DollarsAtWork.Api.Features.Billing;

/// <summary>Stripe settings. The keys come from user secrets (dev) or app settings (production), never from code.</summary>
public class StripeOptions
{
    public string SecretKey { get; set; } = "";
    /// <summary>Signing secret for the webhook endpoint. Without it, webhooks are refused.</summary>
    public string WebhookSecret { get; set; } = "";
    public string MonthlyPriceId { get; set; } = "";
    public string AnnualPriceId { get; set; } = "";
    /// <summary>Let Stripe act as merchant of record (it handles sales tax). Needs a tax code on the product.</summary>
    public bool ManagedPayments { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(MonthlyPriceId) && !string.IsNullOrWhiteSpace(AnnualPriceId);
}

/// <summary>Interval is "month" or "year".</summary>
public record CheckoutRequest(string? Interval);

/// <summary>Where to send the browser next: Stripe Checkout or the Stripe customer portal.</summary>
public record RedirectResponse(string Url);

public record PriceResponse(decimal Amount, string Currency);

/// <summary>Enabled is false when Stripe isn't set up on this server; the prices are then null.</summary>
public record PricesResponse(bool Enabled, PriceResponse? Monthly, PriceResponse? Annual);
