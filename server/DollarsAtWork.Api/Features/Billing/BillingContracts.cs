namespace DollarsAtWork.Api.Features.Billing;

/// <summary>Stripe settings. The keys come from user secrets (dev) or app settings (production), never from code.</summary>
public class StripeOptions
{
    public string SecretKey { get; set; } = "";
    /// <summary>Signing secret for the webhook endpoint. Without it, webhooks are refused.</summary>
    public string WebhookSecret { get; set; } = "";
    public string MonthlyPriceId { get; set; } = "";
    public string AnnualPriceId { get; set; } = "";
    /// <summary>The founding annual price, offered to the first <see cref="FoundingLimit"/> buyers. Optional: empty means no founding offer.</summary>
    public string FoundingPriceId { get; set; } = "";
    /// <summary>How many founding subscriptions are sold before the offer closes.</summary>
    public int FoundingLimit { get; set; } = 200;
    /// <summary>Let Stripe act as merchant of record (it handles sales tax). Needs a tax code on the product.</summary>
    public bool ManagedPayments { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(MonthlyPriceId) && !string.IsNullOrWhiteSpace(AnnualPriceId);
}

/// <summary>Plan is "monthly", "annual" or "founding". Interval ("month" or "year") is the older way to say the first two.</summary>
public record CheckoutRequest(string? Interval, string? Plan = null);

/// <summary>Where to send the browser next: Stripe Checkout or the Stripe customer portal.</summary>
public record RedirectResponse(string Url);

public record PriceResponse(decimal Amount, string Currency);

/// <summary>The founding offer: its price, and how many of the limited spots are taken. Open is false once they're all gone.</summary>
public record FoundingResponse(PriceResponse Price, int Taken, int Limit, bool Open);

/// <summary>Enabled is false when Stripe isn't set up on this server; the prices are then null. Founding is null when there's no founding offer.</summary>
public record PricesResponse(bool Enabled, PriceResponse? Monthly, PriceResponse? Annual, FoundingResponse? Founding = null);
