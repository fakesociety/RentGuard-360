using System;
using System.Collections.Generic;
using System.Linq;
using Stripe;

namespace StripePaymentAPI.Services
{
    public class StripeService : IStripeService
    {
        public Customer GetOrCreateStripeCustomer(string email, string name, string userId)
        {
            var customerService = new CustomerService();
            var listOptions = new CustomerListOptions
            {
                Email = email,
                Limit = 1
            };

            StripeList<Customer> existingCustomers = customerService.List(listOptions);

            if (existingCustomers.Data != null && existingCustomers.Data.Count > 0)
            {
                return existingCustomers.Data[0];
            }

            var createOptions = new CustomerCreateOptions
            {
                Email = email,
                Name = name ?? "",
                Metadata = new Dictionary<string, string>
                {
                    { "rentguard_user_id", userId }
                }
            };
            return customerService.Create(createOptions);
        }

        public void CreateInvoiceForPayment(string customerId, string packageName, long amountInSmallestUnit, string currency, string paymentIntentId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(customerId) || amountInSmallestUnit <= 0)
                {
                    return;
                }

                var invoiceService = new InvoiceService();
                var existingInvoices = invoiceService.List(new InvoiceListOptions
                {
                    Customer = customerId,
                    Limit = 20
                });

                bool alreadyExists = existingInvoices?.Data?.Any(inv =>
                    inv?.Metadata != null
                    && inv.Metadata.TryGetValue("payment_intent_id", out string existingPaymentIntentId)
                    && string.Equals(existingPaymentIntentId, paymentIntentId, StringComparison.Ordinal)) == true;

                if (alreadyExists)
                {
                    return;
                }

                Invoice invoice = invoiceService.Create(new InvoiceCreateOptions
                {
                    Customer = customerId,
                    Currency = currency.ToLower(),
                    AutoAdvance = false,
                    CollectionMethod = "send_invoice",
                    DaysUntilDue = 0,
                    Metadata = new Dictionary<string, string>
                    {
                        { "payment_intent_id", paymentIntentId }
                    }
                });

                var invoiceItemService = new InvoiceItemService();
                invoiceItemService.Create(new InvoiceItemCreateOptions
                {
                    Customer = customerId,
                    Invoice = invoice.Id,
                    UnitAmount = amountInSmallestUnit,
                    Currency = currency.ToLower(),
                    Description = $"RentGuard 360 — {packageName}"
                });

                invoiceService.FinalizeInvoice(invoice.Id);

                invoiceService.Pay(invoice.Id, new InvoicePayOptions
                {
                    PaidOutOfBand = true
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Invoice] Warning: Could not create invoice for PI {paymentIntentId}: {ex.Message}");
            }
        }

        public PaymentIntent CreatePaymentIntent(long amount, string currency, string customerId, string userId, int packageId, string packageName)
        {
            var options = new PaymentIntentCreateOptions
            {
                Amount = amount,
                Currency = currency.ToLower(),
                Metadata = new Dictionary<string, string>
                {
                    { "userId", userId },
                    { "packageId", packageId.ToString() },
                    { "packageName", packageName }
                },
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                }
            };

            if (!string.IsNullOrWhiteSpace(customerId))
            {
                options.Customer = customerId;
                options.SetupFutureUsage = "off_session";
            }

            var service = new PaymentIntentService();
            return service.Create(options);
        }

        public PaymentIntent GetPaymentIntent(string paymentIntentId)
        {
            var service = new PaymentIntentService();
            return service.Get(paymentIntentId);
        }

        public Stripe.BillingPortal.Session CreateCustomerPortalSession(string customerId, string returnUrl)
        {
            var portalService = new Stripe.BillingPortal.SessionService();
            var portalOptions = new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = customerId,
                ReturnUrl = returnUrl
            };

            return portalService.Create(portalOptions);
        }

        public Event ConstructEvent(string json, string signatureHeader, string webhookSecret)
        {
            return EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
        }

        public object GetAdminStripeSummary()
        {
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

                return new
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
                return new
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
        }
    }
}
