using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Stripe;
using Subscription = DollarsAtWork.Api.Domain.Subscription;

namespace DollarsAtWork.Api.Features.Billing;

/// <summary>
/// Everything that talks to Stripe. Stripe is the source of truth for billing: this class only ever
/// copies Stripe's view of a subscription onto ours, whether the news arrives by webhook or by asking.
/// </summary>
public class BillingService(
    AppDbContext db,
    IOptions<StripeOptions> stripeOptions,
    IOptions<AppOptions> appOptions,
    TimeProvider clock,
    IMemoryCache cache,
    ILogger<BillingService> logger)
{
    private readonly StripeOptions _stripe = stripeOptions.Value;
    private StripeClient? _client;

    public bool IsConfigured => _stripe.IsConfigured;
    public string WebhookSecret => _stripe.WebhookSecret;

    private StripeClient Client => _client ??= new StripeClient(_stripe.SecretKey);
    private string BaseUrl => appOptions.Value.PublicUrl.TrimEnd('/');

    public bool HasFoundingOffer => IsConfigured && !string.IsNullOrWhiteSpace(_stripe.FoundingPriceId);

    public async Task<PricesResponse> GetPricesAsync(CancellationToken ct)
    {
        if (!IsConfigured)
            return new PricesResponse(false, null, null);

        // Prices rarely change; don't ask Stripe on every page view.
        var (monthly, annual, founding) = (await cache.GetOrCreateAsync("billing:prices", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            var prices = new PriceService(Client);
            var m = await prices.GetAsync(_stripe.MonthlyPriceId, cancellationToken: ct);
            var a = await prices.GetAsync(_stripe.AnnualPriceId, cancellationToken: ct);
            PriceResponse? f = null;
            if (HasFoundingOffer)
            {
                try
                {
                    f = ToResponse(await prices.GetAsync(_stripe.FoundingPriceId, cancellationToken: ct));
                }
                catch (StripeException ex)
                {
                    // A wrong founding price id shouldn't take the regular prices down with it.
                    logger.LogWarning(ex, "Couldn't load the founding price {PriceId}", _stripe.FoundingPriceId);
                }
            }
            return (ToResponse(m), ToResponse(a), f);
        }));

        if (founding is null)
            return new PricesResponse(true, monthly, annual);

        var taken = await FoundingTakenAsync(ct);
        return new PricesResponse(true, monthly, annual, new FoundingResponse(founding, Math.Min(taken, _stripe.FoundingLimit), _stripe.FoundingLimit, taken < _stripe.FoundingLimit));

        static PriceResponse ToResponse(Price price) => new((price.UnitAmount ?? 0) / 100m, price.Currency.ToUpperInvariant());
    }

    /// <summary>
    /// How many founding spots are taken: subscriptions on the founding price that got as far as a first payment
    /// (or a 100% off code), counted from Stripe itself so nothing here can drift from it. Cached for a minute.
    /// The cap is soft: two people checking out in the same minute as the last spot could both get it.
    /// </summary>
    public async Task<int> FoundingTakenAsync(CancellationToken ct)
    {
        if (!HasFoundingOffer)
            return 0;

        return await cache.GetOrCreateAsync("billing:founding-taken", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            var count = 0;
            var options = new SubscriptionListOptions { Price = _stripe.FoundingPriceId, Status = "all", Limit = 100 };
            await foreach (var s in new SubscriptionService(Client).ListAutoPagingAsync(options, cancellationToken: ct))
            {
                // Never-paid checkouts don't hold a spot.
                if (s.Status is not ("incomplete" or "incomplete_expired"))
                    count++;
                if (count >= _stripe.FoundingLimit)
                    break;
            }
            return count;
        });
    }

    /// <summary>Starts Stripe Checkout for the monthly, annual or founding plan and returns its address.</summary>
    public async Task<string> CreateCheckoutUrlAsync(AppUser user, BillingPlan plan, CancellationToken ct)
    {
        var subscription = await db.Subscriptions.SingleAsync(s => s.UserId == user.Id, ct);
        var customerId = await EnsureCustomerAsync(user, subscription, ct);

        var options = new Stripe.Checkout.SessionCreateOptions
        {
            Mode = "subscription",
            Customer = customerId,
            ClientReferenceId = user.Id.ToString(),
            LineItems = [new Stripe.Checkout.SessionLineItemOptions { Price = PriceIdFor(plan), Quantity = 1 }],
            // Lets someone enter a promotion code made in the Stripe dashboard (a coach's free code, say).
            AllowPromotionCodes = true,
            // A code that makes it free needs no card; everything else still asks for one.
            PaymentMethodCollection = "if_required",
            SuccessUrl = $"{BaseUrl}/profile?billing=success",
            CancelUrl = $"{BaseUrl}/profile?billing=canceled",
        };
        // Plain Stripe Checkout: we are the seller. Stripe's Managed Payments (Stripe as merchant of record)
        // is on by default for new accounts and needs product tax codes; turning it on is a launch decision.
        if (!_stripe.ManagedPayments)
            options.AddExtraParam("managed_payments[enabled]", false);

        var session = await new Stripe.Checkout.SessionService(Client).CreateAsync(options, cancellationToken: ct);

        return session.Url;
    }

    private string PriceIdFor(BillingPlan plan) => plan switch
    {
        BillingPlan.Founding => _stripe.FoundingPriceId,
        BillingPlan.Annual => _stripe.AnnualPriceId,
        _ => _stripe.MonthlyPriceId,
    };

    /// <summary>Opens the Stripe customer portal (change card, switch plan, cancel). Null if the user has never checked out.</summary>
    public async Task<string?> CreatePortalUrlAsync(Guid userId, CancellationToken ct)
    {
        var customerId = await db.Subscriptions.Where(s => s.UserId == userId).Select(s => s.StripeCustomerId).SingleAsync(ct);
        if (customerId is null)
            return null;

        var session = await new Stripe.BillingPortal.SessionService(Client).CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = customerId,
            ReturnUrl = $"{BaseUrl}/profile?billing=updated",
        }, cancellationToken: ct);

        return session.Url;
    }

    /// <summary>Asks Stripe for this user's subscription and copies its state. Used when returning from Checkout or the portal.</summary>
    public async Task SyncFromStripeAsync(Guid userId, CancellationToken ct)
    {
        var subscription = await db.Subscriptions.SingleAsync(s => s.UserId == userId, ct);
        if (!IsConfigured || subscription.StripeCustomerId is null)
            return;

        var all = await new SubscriptionService(Client).ListAsync(
            new SubscriptionListOptions { Customer = subscription.StripeCustomerId, Status = "all", Limit = 20 }, cancellationToken: ct);

        // A live subscription wins over an ended one; otherwise take the newest.
        var current = all.Data
            .OrderByDescending(s => s.Status is "active" or "trialing" or "past_due" or "unpaid")
            .ThenByDescending(s => s.Created)
            .FirstOrDefault();
        if (current is null)
            return;

        Apply(subscription, current);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Handles one webhook event. Returns false when the event was already processed, so Stripe's retries are harmless.
    /// </summary>
    public async Task<bool> HandleEventAsync(Event stripeEvent, CancellationToken ct)
    {
        if (await db.ProcessedStripeEvents.AnyAsync(e => e.EventId == stripeEvent.Id, ct))
            return false;
        db.ProcessedStripeEvents.Add(new ProcessedStripeEvent { EventId = stripeEvent.Id, ReceivedAt = clock.GetUtcNow() });

        switch (stripeEvent.Data.Object)
        {
            case Stripe.Checkout.Session session when stripeEvent.Type == EventTypes.CheckoutSessionCompleted:
                await OnCheckoutCompletedAsync(session, ct);
                break;

            case Stripe.Subscription stripeSubscription when stripeEvent.Type is EventTypes.CustomerSubscriptionCreated
                or EventTypes.CustomerSubscriptionUpdated or EventTypes.CustomerSubscriptionDeleted:
                var ours = await db.Subscriptions.SingleOrDefaultAsync(s => s.StripeCustomerId == stripeSubscription.CustomerId, ct);
                if (ours is null)
                    logger.LogWarning("Stripe event {EventId} is for unknown customer {CustomerId}", stripeEvent.Id, stripeSubscription.CustomerId);
                else
                    Apply(ours, stripeSubscription);
                break;
        }

        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException) when (db.ChangeTracker.Entries<ProcessedStripeEvent>().Any())
        {
            // Two deliveries of the same event raced; the other one won.
            return false;
        }
    }

    /// <summary>
    /// Ends billing for an account that is being deleted: removing the Stripe customer cancels its subscriptions at once.
    /// Throws if Stripe can't be reached, so the caller can refuse to delete.
    /// </summary>
    public async Task CancelForDeletedAccountAsync(Guid userId, CancellationToken ct)
    {
        var customerId = await db.Subscriptions.Where(s => s.UserId == userId).Select(s => s.StripeCustomerId).SingleOrDefaultAsync(ct);
        if (customerId is null || !IsConfigured)
            return;

        try
        {
            await new CustomerService(Client).DeleteAsync(customerId, cancellationToken: ct);
        }
        catch (StripeException ex) when (ex.StripeError?.Code == "resource_missing")
        {
            // Already gone on Stripe's side; nothing left to cancel.
        }
    }

    /// <summary>Keeps Stripe's receipts going to the right address after an email change. Best effort.</summary>
    public async Task UpdateCustomerEmailAsync(AppUser user, CancellationToken ct)
    {
        var customerId = await db.Subscriptions.Where(s => s.UserId == user.Id).Select(s => s.StripeCustomerId).SingleOrDefaultAsync(ct);
        if (customerId is null || !IsConfigured)
            return;

        try
        {
            await new CustomerService(Client).UpdateAsync(customerId, new CustomerUpdateOptions { Email = user.Email }, cancellationToken: ct);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Couldn't update the Stripe email for customer {CustomerId}", customerId);
        }
    }

    private async Task OnCheckoutCompletedAsync(Stripe.Checkout.Session session, CancellationToken ct)
    {
        if (!Guid.TryParse(session.ClientReferenceId, out var userId) || session.SubscriptionId is null)
            return;

        var ours = await db.Subscriptions.SingleOrDefaultAsync(s => s.UserId == userId, ct);
        if (ours is null)
            return;

        ours.StripeCustomerId = session.CustomerId;
        Apply(ours, await new SubscriptionService(Client).GetAsync(session.SubscriptionId, cancellationToken: ct));
    }

    private async Task<string> EnsureCustomerAsync(AppUser user, Subscription subscription, CancellationToken ct)
    {
        if (subscription.StripeCustomerId is { } existing)
            return existing;

        var customer = await new CustomerService(Client).CreateAsync(new CustomerCreateOptions
        {
            Email = user.Email,
            Metadata = new Dictionary<string, string> { ["userId"] = user.Id.ToString() },
        }, cancellationToken: ct);

        subscription.StripeCustomerId = customer.Id;
        subscription.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return customer.Id;
    }

    /// <summary>Copies Stripe's view of a subscription onto ours. The status rules are in docs/PLAN.md.</summary>
    public void Apply(Subscription ours, Stripe.Subscription theirs)
    {
        var now = clock.GetUtcNow();
        var item = theirs.Items?.Data?.FirstOrDefault();
        DateTimeOffset? periodEnd = item is null ? null : new DateTimeOffset(DateTime.SpecifyKind(item.CurrentPeriodEnd, DateTimeKind.Utc));

        var newSubscription = ours.StripeSubscriptionId != theirs.Id;
        ours.StripeSubscriptionId = theirs.Id;
        ours.BillingInterval = item?.Price?.Recurring?.Interval ?? ours.BillingInterval;
        ours.UpdatedAt = now;

        switch (theirs.Status)
        {
            case "active" or "trialing":
                // Canceled-but-paid-up keeps full access until the period ends.
                var cancelAt = theirs.CancelAt is { } at ? new DateTimeOffset(DateTime.SpecifyKind(at, DateTimeKind.Utc)) : (DateTimeOffset?)null;
                ours.Status = theirs.CancelAtPeriodEnd || cancelAt is not null ? SubscriptionStatus.Canceled : SubscriptionStatus.Active;
                ours.CurrentPeriodEnd = cancelAt ?? periodEnd;
                ours.PastDueSince = null;
                break;

            case "past_due" or "unpaid":
                ours.Status = SubscriptionStatus.PastDue;
                ours.CurrentPeriodEnd = periodEnd;
                ours.PastDueSince ??= now;
                break;

            case "canceled" or "incomplete_expired":
                ours.Status = SubscriptionStatus.Canceled;
                ours.CurrentPeriodEnd = theirs.EndedAt is { } ended ? new DateTimeOffset(DateTime.SpecifyKind(ended, DateTimeKind.Utc)) : now;
                ours.PastDueSince = null;
                break;

            // "incomplete" and "paused": the first payment hasn't settled, so nothing changes yet.
        }

        // An anonymous count for the owner's Numbers page, the first time each Stripe subscription turns up live.
        // A side effect of copying Stripe's state, never an input to it.
        if (newSubscription && theirs.Status is ("active" or "trialing"))
            Common.UsageEvents.Record(db, clock, Common.UsageEvents.Subscribed);
    }
}

public enum BillingPlan
{
    Monthly,
    Annual,
    Founding,
}
