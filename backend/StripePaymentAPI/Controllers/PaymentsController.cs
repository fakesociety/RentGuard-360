using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Data.SqlClient;
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

        private string GetAuthenticatedUserId()
        {
            return User.FindFirstValue("sub")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("cognito:username")
                ?? User.FindFirstValue(ClaimTypes.Email);
        }

        private bool IsAdminCaller()
        {
            IEnumerable<Claim> groupClaims = User.Claims.Where(c =>
                c.Type == "cognito:groups" || c.Type == ClaimTypes.Role);

            foreach (Claim claim in groupClaims)
            {
                string normalized = claim.Value
                    .Replace("[", string.Empty)
                    .Replace("]", string.Empty)
                    .Replace("\"", string.Empty);

                string[] parts = normalized.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Any(p => string.Equals(p, "Admins", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            return false;
        }

        private bool IsInternalApiCall()
        {
            string configuredKey = _configuration["InternalApi:Key"];
            if (string.IsNullOrWhiteSpace(configuredKey)) return false;

            string providedKey = Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            return !string.IsNullOrWhiteSpace(providedKey) &&
                   string.Equals(providedKey, configuredKey, StringComparison.Ordinal);
        }

        private IActionResult ValidateUserAccess(string requestedUserId)
        {
            if (string.IsNullOrWhiteSpace(requestedUserId))
            {
                return BadRequest(new { error = "userId is required" });
            }

            string callerUserId = GetAuthenticatedUserId();
            if (string.IsNullOrWhiteSpace(callerUserId))
            {
                return Unauthorized(new { error = "Authenticated user context is missing" });
            }

            if (IsAdminCaller())
            {
                return null;
            }

            if (!string.Equals(callerUserId, requestedUserId, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            return null;
        }

        private IActionResult EnsureAdminAccess()
        {
            if (!User?.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            if (!IsAdminCaller())
            {
                return Forbid();
            }

            return null;
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
                    var confirmService = new PaymentIntentService();
                    var existingIntent = confirmService.Get(request.PaymentIntentId);

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

                UserSubscription subscription = _repository.GetSubscriptionByUserId(userId);

                if (subscription == null && IsAdminCaller())
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

                if (IsAdminCaller())
                {
                    return Ok(new
                    {
                        message = "Admin user has unlimited scans",
                        scansRemaining = -1,
                        isUnlimited = true
                    });
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
                if (!isInternal && !IsAdminCaller())
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

                decimal totalRevenue = 0m;
                int totalTransactions = 0;
                int successfulTransactions = 0;
                int failedTransactions = 0;
                int activeSubscribers = 0;
                decimal avgOrderValue = 0m;
                List<object> bundleBreakdown = new List<object>();
                List<object> recentTransactions = new List<object>();

                string connStr = _configuration.GetConnectionString("PaymentsDB");
                if (!string.IsNullOrWhiteSpace(connStr))
                {
                    using (SqlConnection connection = new SqlConnection(connStr))
                    {
                        connection.Open();

                        string overviewSql = @"
SELECT
    COUNT(*) AS TotalTransactions,
    SUM(CASE WHEN Status = 'succeeded' THEN 1 ELSE 0 END) AS SuccessfulTransactions,
    SUM(CASE WHEN Status = 'failed' THEN 1 ELSE 0 END) AS FailedTransactions,
    ISNULL(SUM(CASE WHEN Status = 'succeeded' THEN Amount ELSE 0 END), 0) AS TotalRevenue,
    ISNULL(AVG(CASE WHEN Status = 'succeeded' THEN Amount END), 0) AS AvgOrderValue
FROM Transactions;
SELECT COUNT(*) AS ActiveSubscribers FROM UserSubscriptions;";

                        using (SqlCommand cmd = new SqlCommand(overviewSql, connection))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                totalTransactions = Convert.ToInt32(reader["TotalTransactions"]);
                                successfulTransactions = Convert.ToInt32(reader["SuccessfulTransactions"]);
                                failedTransactions = Convert.ToInt32(reader["FailedTransactions"]);
                                totalRevenue = Convert.ToDecimal(reader["TotalRevenue"]);
                                avgOrderValue = Convert.ToDecimal(reader["AvgOrderValue"]);
                            }

                            if (reader.NextResult() && reader.Read())
                            {
                                activeSubscribers = Convert.ToInt32(reader["ActiveSubscribers"]);
                            }
                        }

                        string bundlesSql = @"
SELECT p.Name, COUNT(*) AS SubscriberCount
FROM UserSubscriptions s
JOIN Packages p ON p.Id = s.PackageId
GROUP BY p.Name
ORDER BY SubscriberCount DESC;";
                        using (SqlCommand cmdBundles = new SqlCommand(bundlesSql, connection))
                        using (SqlDataReader bundlesReader = cmdBundles.ExecuteReader())
                        {
                            while (bundlesReader.Read())
                            {
                                bundleBreakdown.Add(new
                                {
                                    name = Convert.ToString(bundlesReader["Name"]),
                                    count = Convert.ToInt32(bundlesReader["SubscriberCount"])
                                });
                            }
                        }

                        string recentSql = @"
SELECT TOP 8 t.UserId, p.Name AS BundleName, t.Amount, t.Currency, t.Status, t.CreatedAt
FROM Transactions t
JOIN Packages p ON p.Id = t.PackageId
ORDER BY t.CreatedAt DESC;";
                        using (SqlCommand cmdRecent = new SqlCommand(recentSql, connection))
                        using (SqlDataReader recentReader = cmdRecent.ExecuteReader())
                        {
                            while (recentReader.Read())
                            {
                                recentTransactions.Add(new
                                {
                                    userId = Convert.ToString(recentReader["UserId"]),
                                    bundleName = Convert.ToString(recentReader["BundleName"]),
                                    amount = Convert.ToDecimal(recentReader["Amount"]),
                                    currency = Convert.ToString(recentReader["Currency"]),
                                    status = Convert.ToString(recentReader["Status"]),
                                    createdAt = Convert.ToDateTime(recentReader["CreatedAt"]).ToString("o")
                                });
                            }
                        }
                    }
                }

                var stripeSummary = new
                {
                    availableBalance = 0m,
                    pendingBalance = 0m,
                    chargesLast30Days = 0,
                    successfulChargesLast30Days = 0,
                    failedChargesLast30Days = 0,
                    refundedChargesLast30Days = 0,
                    refundedAmountLast30Days = 0m,
                    disputeCountLast30Days = 0,
                    paymentIntentsLast30Days = 0,
                    accountCountry = "N/A",
                    defaultCurrency = "N/A",
                    chargesEnabled = false,
                    payoutsEnabled = false,
                    paymentMethodBreakdown = new List<object>(),
                    countryBreakdown = new List<object>(),
                    currencyBreakdown = new List<object>(),
                    error = string.Empty
                };

                try
                {
                    DateRangeOptions last30Days = new DateRangeOptions
                    {
                        GreaterThanOrEqual = DateTime.UtcNow.AddDays(-30)
                    };

                    Balance balance = new BalanceService().Get();
                    decimal available = balance.Available?.Sum(b => b.Amount) / 100m ?? 0m;
                    decimal pending = balance.Pending?.Sum(b => b.Amount) / 100m ?? 0m;

                    ChargeListOptions chargeOptions = new ChargeListOptions
                    {
                        Created = last30Days,
                        Limit = 100
                    };
                    List<Charge> charges = new ChargeService().ListAutoPaging(chargeOptions).Take(500).ToList();
                    int successfulCharges = charges.Count(c => c.Paid && !string.Equals(c.Status, "failed", StringComparison.OrdinalIgnoreCase));
                    int failedCharges = charges.Count(c => string.Equals(c.Status, "failed", StringComparison.OrdinalIgnoreCase));
                    int refundedCharges = charges.Count(c => c.Refunded);
                    decimal refundedAmount = charges
                        .Where(c => c.Refunded)
                        .Sum(c => Convert.ToDecimal(c.AmountRefunded)) / 100m;

                    Dictionary<string, int> paymentMethodCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    Dictionary<string, (int count, decimal revenue)> countryStats = new Dictionary<string, (int, decimal)>(StringComparer.OrdinalIgnoreCase);
                    Dictionary<string, decimal> currencyStats = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

                    foreach (Charge charge in charges)
                    {
                        string paymentType = charge.PaymentMethodDetails?.Type ?? "unknown";
                        if (!paymentMethodCounts.ContainsKey(paymentType))
                        {
                            paymentMethodCounts[paymentType] = 0;
                        }
                        paymentMethodCounts[paymentType]++;

                        string country = charge.BillingDetails?.Address?.Country;
                        if (string.IsNullOrWhiteSpace(country))
                        {
                            country = "Unknown";
                        }

                        decimal chargeRevenue = Convert.ToDecimal(charge.Amount) / 100m;
                        if (!countryStats.ContainsKey(country))
                        {
                            countryStats[country] = (0, 0m);
                        }
                        countryStats[country] = (countryStats[country].count + 1, countryStats[country].revenue + chargeRevenue);

                        string currency = (charge.Currency ?? "n/a").ToUpper();
                        if (!currencyStats.ContainsKey(currency))
                        {
                            currencyStats[currency] = 0m;
                        }
                        currencyStats[currency] += chargeRevenue;
                    }

                    List<object> paymentMethodBreakdown = paymentMethodCounts
                        .OrderByDescending(kv => kv.Value)
                        .Select(kv => (object)new { method = kv.Key, count = kv.Value })
                        .ToList();

                    List<object> countryBreakdown = countryStats
                        .OrderByDescending(kv => kv.Value.count)
                        .Take(12)
                        .Select(kv => (object)new { country = kv.Key.ToUpper(), count = kv.Value.count, revenue = kv.Value.revenue })
                        .ToList();

                    List<object> currencyBreakdown = currencyStats
                        .OrderByDescending(kv => kv.Value)
                        .Select(kv => (object)new { currency = kv.Key, amount = kv.Value })
                        .ToList();

                    DisputeListOptions disputeOptions = new DisputeListOptions
                    {
                        Created = last30Days,
                        Limit = 100
                    };
                    int disputes = new DisputeService().ListAutoPaging(disputeOptions).Take(500).Count();

                    PaymentIntentListOptions piOptions = new PaymentIntentListOptions
                    {
                        Created = last30Days,
                        Limit = 100
                    };
                    int intents = new PaymentIntentService().ListAutoPaging(piOptions).Take(500).Count();

                    stripeSummary = new
                    {
                        availableBalance = available,
                        pendingBalance = pending,
                        chargesLast30Days = charges.Count,
                        successfulChargesLast30Days = successfulCharges,
                        failedChargesLast30Days = failedCharges,
                        refundedChargesLast30Days = refundedCharges,
                        refundedAmountLast30Days = refundedAmount,
                        disputeCountLast30Days = disputes,
                        paymentIntentsLast30Days = intents,
                        accountCountry = "N/A",
                        defaultCurrency = balance.Available?.FirstOrDefault()?.Currency?.ToUpper() ?? "N/A",
                        chargesEnabled = true,
                        payoutsEnabled = true,
                        paymentMethodBreakdown,
                        countryBreakdown,
                        currencyBreakdown,
                        error = string.Empty
                    };
                }
                catch (Exception stripeEx)
                {
                    stripeSummary = new
                    {
                        availableBalance = 0m,
                        pendingBalance = 0m,
                        chargesLast30Days = 0,
                        successfulChargesLast30Days = 0,
                        failedChargesLast30Days = 0,
                        refundedChargesLast30Days = 0,
                        refundedAmountLast30Days = 0m,
                        disputeCountLast30Days = 0,
                        paymentIntentsLast30Days = 0,
                        accountCountry = "N/A",
                        defaultCurrency = "N/A",
                        chargesEnabled = false,
                        payoutsEnabled = false,
                        paymentMethodBreakdown = new List<object>(),
                        countryBreakdown = new List<object>(),
                        currencyBreakdown = new List<object>(),
                        error = stripeEx.Message
                    };
                }

                return Ok(new
                {
                    sql = new
                    {
                        totalTransactions,
                        successfulTransactions,
                        failedTransactions,
                        totalRevenue,
                        avgOrderValue,
                        activeSubscribers,
                        bundleBreakdown,
                        recentTransactions
                    },
                    stripe = stripeSummary,
                    generatedAt = DateTime.UtcNow.ToString("o")
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
    /// Request body for creating a Stripe PaymentIntent or confirming a payment.
    /// </summary>
    public class CreateIntentRequest
    {
        public string UserId { get; set; }
        public int PackageId { get; set; }
        public string Action { get; set; } // "create" or "confirm"
        public string PaymentIntentId { get; set; } // Used when Action == "confirm"
    }

    /// <summary>
    /// Request body for deducting a scan credit.
    /// </summary>
    public class DeductRequest
    {
        public string UserId { get; set; }
    }
}
