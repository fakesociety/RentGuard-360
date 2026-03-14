using Microsoft.AspNetCore.Mvc;
using Stripe;
using StripePaymentAPI.Models;
using StripePaymentAPI.Repositories;

namespace StripePaymentAPI.Controllers
{
    /// <summary>
    /// PaymentsController - Handles Stripe payment operations.
    /// Inherits from ControllerBase and uses [ApiController] as taught in the course.
    /// The IPaymentRepository is injected via Dependency Injection (constructor).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        // Repository injected via DI
        private readonly IPaymentRepository _repository;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Constructor - receives dependencies via Dependency Injection.
        /// </summary>
        public PaymentsController(IPaymentRepository repository, IConfiguration configuration)
        {
            _repository = repository;
            _configuration = configuration;
        }

        // =====================================================================
        // POST api/payments/create-intent
        // Creates a Stripe PaymentIntent for a package purchase
        // =====================================================================

        /// <summary>
        /// Creates a Stripe PaymentIntent so the React frontend can collect payment.
        /// Receives packageId and userId from the request body ([FromBody]).
        /// Returns the client_secret that React uses with Stripe Elements.
        /// </summary>
        [HttpPost("create-intent")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult CreatePaymentIntent([FromBody] CreateIntentRequest request)
        {
            try
            {
                // Validate request
                if (request == null || string.IsNullOrEmpty(request.UserId) || request.PackageId <= 0)
                {
                    return BadRequest(new { error = "UserId and PackageId are required" });
                }

                // Get the package from the database
                Models.Package package = _repository.GetPackageById(request.PackageId);

                if (package == null)
                {
                    return NotFound(new { error = $"Package with ID {request.PackageId} was not found" });
                }

                // Free package - no payment needed
                if (package.Price <= 0)
                {
                    // Directly assign the free package to the user
                    _repository.UpsertSubscription(request.UserId, package.Id, package.ScanLimit);

                    return Ok(new
                    {
                        clientSecret = (string)null,
                        isFree = true,
                        message = "Free package activated successfully",
                        packageName = package.Name,
                        scansRemaining = package.ScanLimit
                    });
                }

                // Create Stripe PaymentIntent
                // Amount is in the smallest currency unit (agorot for ILS)
                var options = new PaymentIntentCreateOptions
                {
                    Amount = (long)(package.Price * 100), // Convert to agorot/cents
                    Currency = package.Currency.ToLower(),
                    Metadata = new Dictionary<string, string>
                    {
                        { "userId", request.UserId },
                        { "packageId", package.Id.ToString() },
                        { "packageName", package.Name }
                    },
                    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                    {
                        Enabled = true
                    }
                };

                var service = new PaymentIntentService();
                PaymentIntent paymentIntent = service.Create(options);

                return Ok(new
                {
                    clientSecret = paymentIntent.ClientSecret,
                    isFree = false,
                    paymentIntentId = paymentIntent.Id,
                    amount = package.Price,
                    currency = package.Currency,
                    packageName = package.Name
                });
            }
            catch (StripeException ex)
            {
                return BadRequest(new { error = $"Stripe error: {ex.Message}" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // POST api/payments/webhook
        // Stripe webhook - called by Stripe when payment succeeds/fails
        // This endpoint has NO authentication (Stripe signs it instead)
        // =====================================================================

        /// <summary>
        /// Stripe webhook endpoint. Stripe sends payment events here.
        /// Verifies the webhook signature to prevent spoofing.
        /// On successful payment: saves transaction + updates user subscription.
        /// </summary>
        [HttpPost("webhook")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> StripeWebhook()
        {
            string json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            string webhookSecret = _configuration["Stripe:WebhookSecret"];

            try
            {
                // Verify the webhook signature (security!)
                var stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    webhookSecret
                );

                // Handle the payment_intent.succeeded event
                if (stripeEvent.Type == Events.PaymentIntentSucceeded)
                {
                    var paymentIntent = stripeEvent.Data.Object as PaymentIntent;

                    // Extract metadata we stored when creating the PaymentIntent
                    string userId = paymentIntent.Metadata["userId"];
                    int packageId = int.Parse(paymentIntent.Metadata["packageId"]);

                    // Get package details to know scan limit
                    Models.Package package = _repository.GetPackageById(packageId);

                    if (package != null)
                    {
                        // Save the transaction record to SQL
                        var transaction = new Models.Transaction
                        {
                            UserId = userId,
                            PackageId = packageId,
                            StripePaymentId = paymentIntent.Id,
                            Amount = (decimal)paymentIntent.Amount / 100, // Convert back from agorot
                            Currency = paymentIntent.Currency.ToUpper(),
                            Status = "succeeded"
                        };

                        _repository.AddTransaction(transaction);

                        // Update the user's subscription (UPSERT)
                        _repository.UpsertSubscription(userId, packageId, package.ScanLimit);
                    }
                }
                else if (stripeEvent.Type == Events.PaymentIntentPaymentFailed)
                {
                    var paymentIntent = stripeEvent.Data.Object as PaymentIntent;

                    string userId = paymentIntent.Metadata.ContainsKey("userId")
                        ? paymentIntent.Metadata["userId"] : "unknown";
                    int packageId = paymentIntent.Metadata.ContainsKey("packageId")
                        ? int.Parse(paymentIntent.Metadata["packageId"]) : 0;

                    // Record the failed transaction
                    if (packageId > 0)
                    {
                        var transaction = new Models.Transaction
                        {
                            UserId = userId,
                            PackageId = packageId,
                            StripePaymentId = paymentIntent.Id,
                            Amount = (decimal)paymentIntent.Amount / 100,
                            Currency = paymentIntent.Currency?.ToUpper() ?? "ILS",
                            Status = "failed"
                        };

                        _repository.AddTransaction(transaction);
                    }
                }

                return Ok();
            }
            catch (StripeException ex)
            {
                return BadRequest(new { error = $"Webhook signature verification failed: {ex.Message}" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // GET api/payments/subscription?userId=xxx
        // Returns the user's current subscription and remaining scans
        // =====================================================================

        /// <summary>
        /// Retrieves the current subscription for a user.
        /// The userId is passed as a query string parameter.
        /// </summary>
        [HttpGet("subscription")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetSubscription([FromQuery] string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "userId query parameter is required" });
                }

                UserSubscription subscription = _repository.GetSubscriptionByUserId(userId);

                if (subscription == null)
                {
                    return NotFound(new { error = $"No subscription found for user {userId}" });
                }

                // Also get the package name for display
                Models.Package package = _repository.GetPackageById(subscription.PackageId);

                return Ok(new
                {
                    subscription.UserId,
                    subscription.PackageId,
                    packageName = package?.Name ?? "Unknown",
                    subscription.ScansRemaining,
                    isUnlimited = subscription.ScansRemaining == -1,
                    subscription.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // GET api/payments/transactions?userId=xxx
        // Returns the user's payment history
        // =====================================================================

        /// <summary>
        /// Retrieves all transactions for a specific user.
        /// </summary>
        [HttpGet("transactions")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetTransactions([FromQuery] string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "userId query parameter is required" });
                }

                List<Models.Transaction> transactions = _repository.GetTransactionsByUserId(userId);

                return Ok(new
                {
                    transactions,
                    count = transactions.Count
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // POST api/payments/deduct
        // Deducts one scan credit from the user's subscription
        // =====================================================================

        /// <summary>
        /// Deducts one scan credit from the user's subscription.
        /// Called by the Python Lambda (or React) before processing a contract scan.
        /// </summary>
        [HttpPost("deduct")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult DeductScan([FromBody] DeductRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.UserId))
                {
                    return BadRequest(new { error = "UserId is required" });
                }

                bool success = _repository.DeductScan(request.UserId);

                if (!success)
                {
                    return BadRequest(new
                    {
                        error = "No scans remaining. Please upgrade your package.",
                        scansRemaining = 0
                    });
                }

                // Get updated subscription
                UserSubscription sub = _repository.GetSubscriptionByUserId(request.UserId);

                return Ok(new
                {
                    message = "Scan credit deducted successfully",
                    scansRemaining = sub?.ScansRemaining ?? 0,
                    isUnlimited = sub?.ScansRemaining == -1
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    // =========================================================================
    // REQUEST MODELS (Data Binding - received from [FromBody] as JSON)
    // =========================================================================

    /// <summary>
    /// Request body for creating a Stripe PaymentIntent.
    /// Received as JSON from the React frontend.
    /// </summary>
    public class CreateIntentRequest
    {
        public string UserId { get; set; }
        public int PackageId { get; set; }
    }

    /// <summary>
    /// Request body for deducting a scan credit.
    /// </summary>
    public class DeductRequest
    {
        public string UserId { get; set; }
    }
}
