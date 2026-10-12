using System.Security.Claims;
using DollarsAtWork.Api.Common;
using DollarsAtWork.Api.Data;
using DollarsAtWork.Api.Domain;
using DollarsAtWork.Api.Features.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Stripe;

namespace DollarsAtWork.Api.Features.Billing;

public static class BillingEndpoints
{
    public static RouteGroupBuilder MapBillingEndpoints(this RouteGroupBuilder api)
    {
        var billing = api.MapGroup("/billing").WithTags("Billing");

        // These are open to expired accounts on purpose: subscribing is how they get access back.
        billing.MapGet("/prices", GetPrices).RequireAuthorization();
        billing.MapPost("/checkout", StartCheckout).RequireAuthorization();
        billing.MapPost("/portal", OpenPortal).RequireAuthorization();
        billing.MapPost("/sync", Sync).RequireAuthorization();

        // Called by Stripe, not by a signed-in user. The signature check is the authentication.
        billing.MapPost("/webhook", Webhook).AllowAnonymous();

        return api;
    }

    private static async Task<IResult> GetPrices(BillingService billing, CancellationToken ct) =>
        await CallStripe(async () => Results.Ok(await billing.GetPricesAsync(ct)));

    private static async Task<IResult> StartCheckout(
        CheckoutRequest request,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        BillingService billing,
        CancellationToken ct)
    {
        if (!billing.IsConfigured)
            return NotConfigured();
        if (request.Interval is not ("month" or "year"))
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["interval"] = ["Pick monthly or annual."] });

        var user = await users.FindByIdAsync(principal.GetUserId().ToString());
        if (user is null)
            return Results.Unauthorized();

        return await CallStripe(async () => Results.Ok(new RedirectResponse(await billing.CreateCheckoutUrlAsync(user, request.Interval == "year", ct))));
    }

    private static async Task<IResult> OpenPortal(ClaimsPrincipal principal, BillingService billing, CancellationToken ct)
    {
        if (!billing.IsConfigured)
            return NotConfigured();

        return await CallStripe(async () =>
            await billing.CreatePortalUrlAsync(principal.GetUserId(), ct) is { } url
                ? Results.Ok(new RedirectResponse(url))
                : Results.Problem(title: "You don't have a subscription to manage yet.", statusCode: StatusCodes.Status409Conflict));
    }

    /// <summary>Refreshes the subscription from Stripe and returns the user's access, for when they come back from Stripe.</summary>
    private static async Task<IResult> Sync(ClaimsPrincipal principal, BillingService billing, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        return await CallStripe(async () =>
        {
            await billing.SyncFromStripeAsync(userId, ct);
            var subscription = await db.Subscriptions.AsNoTracking().SingleAsync(s => s.UserId == userId, ct);
            return Results.Ok(AccessResponse.From(subscription, clock.GetUtcNow()));
        });
    }

    private static async Task<IResult> Webhook(HttpRequest request, BillingService billing, ILogger<BillingService> logger, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(billing.WebhookSecret))
            return Results.Problem(title: "Webhooks aren't set up on this server.", statusCode: StatusCodes.Status503ServiceUnavailable);

        using var reader = new StreamReader(request.Body);
        var json = await reader.ReadToEndAsync(ct);

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, request.Headers["Stripe-Signature"], billing.WebhookSecret, throwOnApiVersionMismatch: false);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A missing or wrong signature, or a body that isn't a Stripe event: none of it is trusted.
            return Results.Problem(title: "The webhook signature isn't valid.", statusCode: StatusCodes.Status400BadRequest);
        }

        var handled = await billing.HandleEventAsync(stripeEvent, ct);
        logger.LogInformation("Stripe event {EventId} ({Type}): {Outcome}", stripeEvent.Id, stripeEvent.Type, handled ? "handled" : "already seen");
        return Results.Ok();
    }

    /// <summary>Turns a Stripe failure into a friendly problem instead of a 500.</summary>
    private static async Task<IResult> CallStripe(Func<Task<IResult>> call)
    {
        try
        {
            return await call();
        }
        catch (StripeException ex)
        {
            return Results.Problem(
                title: "We couldn't reach the payment service.",
                detail: ex.StripeError?.Message ?? "Please try again in a moment.",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private static IResult NotConfigured() =>
        Results.Problem(title: "Subscribing isn't set up on this server yet.", statusCode: StatusCodes.Status503ServiceUnavailable);
}
