using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Data.SqlClient;
using Stripe;
using StripePaymentAPI.Models;
using StripePaymentAPI.Models.Requests;
using StripePaymentAPI.Repositories;
using StripePaymentAPI.Services;

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
        private readonly IAdminStatsRepository _adminStatsRepository;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IStripeService _stripeService;
        private readonly IPaymentProcessingService _paymentProcessingService;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Constructor - receives dependencies via Dependency Injection.
        /// </summary>
        public PaymentsController(
            IPaymentRepository repository,
            IAdminStatsRepository adminStatsRepository,
            ISubscriptionService subscriptionService,
            IStripeService stripeService,
            IPaymentProcessingService paymentProcessingService,
            IConfiguration configuration)
        {
            _repository = repository;
            _adminStatsRepository = adminStatsRepository;
            _subscriptionService = subscriptionService;
            _stripeService = stripeService;
            _paymentProcessingService = paymentProcessingService;
            _configuration = configuration;
        }

        private IActionResult ValidateUserAccess(string requestedUserId)
        {
            var res = _subscriptionService.ValidateUserAccess(User, requestedUserId);
            if (!res.IsValid)
            {
                if (res.IsMissingContext) return Unauthorized(new { error = res.ErrorMessage });
                return Forbid();
            }
            return null;
        }

        private IActionResult EnsureAdminAccess()
        {
            var res = _subscriptionService.EnsureAdminAccess(User);
            if (!res.IsValid)
            {
                 if (res.IsMissingContext) return Unauthorized(new { error = res.ErrorMessage });
                 return Forbid();
            }
            return null;
        }

        private bool IsInternalApiCall()
        {
            string configuredKey = _configuration["InternalApi:Key"];
            if (string.IsNullOrWhiteSpace(configuredKey)) return false;

            string providedKey = Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            return !string.IsNullOrWhiteSpace(providedKey) &&
                   string.Equals(providedKey, configuredKey, StringComparison.Ordinal);
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
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public IActionResult CreatePaymentIntent([FromBody] CreateIntentRequest request)
        {
            try
            {
                if (request == null || (string.IsNullOrEmpty(request.UserId) && string.IsNullOrEmpty(request.PaymentIntentId)))
                {
                    return BadRequest(new { error = "Valid request payload is required" });
                }

                // --- NEW: Handle confirmation inside the same endpoint to bypass API Gateway limits ---
                if (request.Action == "confirm" && !string.IsNullOrEmpty(request.PaymentIntentId))
                {
                    var existingIntent = _stripeService.GetPaymentIntent(request.PaymentIntentId);

                    if (existingIntent.Status == "succeeded")
                    {
                        string uId = existingIntent.Metadata.ContainsKey("userId") ? existingIntent.Metadata["userId"] : null;
                        int pId = existingIntent.Metadata.ContainsKey("packageId") ? int.Parse(existingIntent.Metadata["packageId"]) : 0;

                        if (!string.IsNullOrEmpty(uId) && pId > 0)
                        {
                            IActionResult confirmAccessResult = ValidateUserAccess(uId);
                            if (confirmAccessResult != null)
                            {
                                return confirmAccessResult;
                            }

                            var confPackage = _repository.GetPackageById(pId);
                            if (confPackage != null)
                            {
                                var transaction = new Models.Transaction
                                {
                                    UserId = uId,
                                    PackageId = pId,
                                    StripePaymentId = existingIntent.Id,
                                    Amount = (decimal)existingIntent.Amount / 100,
                                    Currency = existingIntent.Currency.ToUpper(),
                                    Status = "succeeded"
                                };
                                try { _repository.AddTransaction(transaction); } catch { /* Ignore */ }
                                _repository.UpsertSubscription(uId, pId, confPackage.ScanLimit);

                                // Create a Stripe Invoice so it appears in Customer Portal
                                if (!string.IsNullOrEmpty(existingIntent.CustomerId))
                                {
                                    long invoiceAmount = existingIntent.AmountReceived > 0
                                        ? existingIntent.AmountReceived
                                        : existingIntent.Amount;

                                    _stripeService.CreateInvoiceForPayment(
                                        existingIntent.CustomerId,
                                        confPackage.Name,
                                        invoiceAmount,
                                        existingIntent.Currency,
                                        existingIntent.Id
                                    );
                                }

                                _repository.DeletePendingPackageSelection(uId);
                                return Ok(new { success = true, isConfirm = true });
                            }
                        }
                    }
                    return BadRequest(new { error = "Payment confirmation failed" });
                }
                // -----------------------------------------------------------------------------------

                IActionResult createAccessResult = ValidateUserAccess(request.UserId);
                if (createAccessResult != null)
                {
                    return createAccessResult;
                }

                // Get the package from the database
                Models.Package package = _repository.GetPackageById(request.PackageId);

                if (package == null)
                {
                    return NotFound(new { error = $"Package with ID {request.PackageId} was not found" });
                }

                UserSubscription existingSubscriptionForPurchase = _repository.GetSubscriptionByUserId(request.UserId);

                // Free package - no payment needed
                if (package.Price <= 0)
                {
                    // Enforce one-time free activation per user.
                    if (existingSubscriptionForPurchase != null)
                    {
                        return BadRequest(new
                        {
                            error = "Free package can only be activated once per user"
                        });
                    }

                    // Directly assign the free package to the user
                    _repository.UpsertSubscription(request.UserId, package.Id, package.ScanLimit);
                    _repository.DeletePendingPackageSelection(request.UserId);

                    return Ok(new
                    {
                        clientSecret = (string)null,
                        isFree = true,
                        message = "Free package activated successfully",
                        packageName = package.Name,
                        scansRemaining = package.ScanLimit
                    });
                }

                string customerId = null;
                // Link the PaymentIntent to a Stripe Customer to sync billing info
                if (!string.IsNullOrWhiteSpace(request.Email))
                {
                    Customer customer = _stripeService.GetOrCreateStripeCustomer(request.Email, request.Name, request.UserId);
                    customerId = customer.Id;
                }

                PaymentIntent paymentIntent = _stripeService.CreatePaymentIntent(
                    (long)(package.Price * 100),
                    package.Currency,
                    customerId,
                    request.UserId,
                    package.Id,
                    package.Name
                );
                
                _repository.UpsertPendingPackageSelection(request.UserId, package.Id, paymentIntent.Id);

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
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> StripeWebhook()
        {
            string json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            string webhookSecret = _configuration["Stripe:WebhookSecret"];

            try
            {
                // Verify the webhook signature (security!)
                var stripeEvent = _stripeService.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    webhookSecret
                );

                // Handle the payment_intent.succeeded event
                if (stripeEvent.Type == Events.PaymentIntentSucceeded)
                {
                    var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                    _paymentProcessingService.ProcessPaymentIntentSucceeded(paymentIntent);
                }
                else if (stripeEvent.Type == Events.PaymentIntentPaymentFailed)
                {
                    var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                    _paymentProcessingService.ProcessPaymentIntentFailed(paymentIntent);
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
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetSubscription([FromQuery] string userId)
        {
            try
            {
                IActionResult accessResult = ValidateUserAccess(userId);
                if (accessResult != null)
                {
                    return accessResult;
                }

                UserSubscription subscription = _subscriptionService.ResolveSubscriptionWithAliases(User, userId);

                if (subscription == null && _subscriptionService.IsAdminCaller(User))
                {
                    return Ok(new
                    {
                        UserId = userId,
                        PackageId = 0,
                        packageName = "Admin",
                        ScansRemaining = -1,
                        isUnlimited = true,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

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
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult GetTransactions([FromQuery] string userId)
        {
            try
            {
                IActionResult accessResult = ValidateUserAccess(userId);
                if (accessResult != null)
                {
                    return accessResult;
                }

                // Check all possible aliases for the authenticated user to ensure transactions 
                // made before identity linking are still shown.
                IEnumerable<string> candidates = new[] { userId }
                    .Concat(_subscriptionService.GetAuthenticatedUserAliases(User))
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Select(id => id.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase);

                List<Models.Transaction> allTransactions = new List<Models.Transaction>();
                foreach (string candidate in candidates)
                {
                    allTransactions.AddRange(_repository.GetTransactionsByUserId(candidate));
                }

                // Deduplicate by Transaction Id (if local DB returned same rows somehow) and sort by date
                List<Models.Transaction> finalTransactions = allTransactions
                    .GroupBy(t => t.Id)
                    .Select(g => g.First())
                    .OrderByDescending(t => t.CreatedAt)
                    .ToList();

                return Ok(new
                {
                    transactions = finalTransactions,
                    count = finalTransactions.Count
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
        [Authorize]
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

                IActionResult accessResult = ValidateUserAccess(request.UserId);
                if (accessResult != null)
                {
                    return accessResult;
                }

                if (_subscriptionService.IsAdminCaller(User))
                {
                    return Ok(new
                    {
                        message = "Admin user has unlimited scans",
                        scansRemaining = -1,
                        isUnlimited = true
                    });
                }

                UserSubscription existingSubscription = _subscriptionService.ResolveSubscriptionWithAliases(User, request.UserId);
                string targetUserId = existingSubscription?.UserId ?? request.UserId;

                bool success = _repository.DeductScan(targetUserId);

                if (!success)
                {
                    return BadRequest(new
                    {
                        error = "No scans remaining. Please upgrade your package.",
                        scansRemaining = 0
                    });
                }

                // Get updated subscription
                UserSubscription sub = _repository.GetSubscriptionByUserId(targetUserId);

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

        [HttpPost("deduct-internal")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult DeductScanInternal([FromBody] DeductRequest request)
        {
            try
            {
                if (!IsInternalApiCall())
                {
                    return Forbid();
                }

                if (request == null || string.IsNullOrWhiteSpace(request.UserId))
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

        [HttpPost("subscriptions-internal")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult GetSubscriptionsInternal([FromBody] InternalSubscriptionsRequest request)
        {
            try
            {
                if (!IsInternalApiCall())
                {
                    return Forbid();
                }

                List<string> userIds = request?.UserIds?
                    .Where(u => !string.IsNullOrWhiteSpace(u))
                    .Select(u => u.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(200)
                    .ToList() ?? new List<string>();

                if (userIds.Count == 0)
                {
                    return Ok(new { subscriptions = new List<object>() });
                }

                List<object> subscriptions = _adminStatsRepository.GetSubscriptionsInternal(userIds);

                return Ok(new { subscriptions });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // DELETE api/payments/subscription?userId=xxx
        // Removes active SQL subscription row (admin/internal only)
        // =====================================================================

        [HttpDelete("subscription")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult DeleteSubscription([FromQuery] string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return BadRequest(new { error = "userId is required" });
                }

                bool isInternal = IsInternalApiCall();
                if (!isInternal && !_subscriptionService.IsAdminCaller(User))
                {
                    return Forbid();
                }

                bool deleted = _repository.DeleteSubscriptionByUserId(userId);
                return Ok(new
                {
                    success = true,
                    deleted
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("admin-stats")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult GetAdminStripeStats()
        {
            try
            {
                IActionResult adminAccess = EnsureAdminAccess();
                if (adminAccess != null)
                {
                    return adminAccess;
                }

                object sqlSummary = _adminStatsRepository.GetPlatformOverview();

                object stripeSummary = _stripeService.GetAdminStripeSummary();

                return Ok(new
                {
                    sql = sqlSummary,
                    stripe = stripeSummary,
                    generatedAt = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // =====================================================================
        // POST api/payments/customer-portal
        // Creates a Stripe Customer Portal session URL
        // =====================================================================

        /// <summary>
        /// Creates a Stripe Customer Portal session.
        /// Finds or creates a Stripe Customer by email, then generates a portal URL
        /// where the user can manage payment methods, view invoices and billing history.
        /// </summary>
        [HttpPost("customer-portal")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public IActionResult CreateCustomerPortalSession([FromBody] CustomerPortalRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new { error = "Email is required" });
                }

                IActionResult accessResult = ValidateUserAccess(request.UserId);
                if (accessResult != null)
                {
                    return accessResult;
                }

                // Step 1: Find existing Stripe Customer by email, or create a new one
                Customer stripeCustomer = _stripeService.GetOrCreateStripeCustomer(request.Email, request.Name, request.UserId);

                // Step 2: Create a Billing Portal Session
                string returnUrl = !string.IsNullOrWhiteSpace(request.ReturnUrl)
                    ? request.ReturnUrl
                    : "http://localhost:5173/billing";

                Stripe.BillingPortal.Session portalSession = _stripeService.CreateCustomerPortalSession(stripeCustomer.Id, returnUrl);

                return Ok(new
                {
                    url = portalSession.Url
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
    }

    // =========================================================================
}
