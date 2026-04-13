using Stripe;
using StripePaymentAPI.Models;
using StripePaymentAPI.Repositories;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace StripePaymentAPI.Services
{
    public class PaymentProcessingService : IPaymentProcessingService
    {
        private readonly IPaymentRepository _repository;
        private readonly IStripeService _stripeService;

        public PaymentProcessingService(
            IPaymentRepository repository,
            IStripeService stripeService)
        {
            _repository = repository;
            _stripeService = stripeService;
        }

        public async Task ProcessPaymentIntentSucceededAsync(PaymentIntent paymentIntent)
        {
            // Idempotency check: Process only if we haven't seen this Stripe payment yet
            bool alreadyProcessed = await _repository.TransactionExistsAsync(paymentIntent.Id);
            if (alreadyProcessed)
            {
                return; // Silently acknowledge duplicate webhook (200 OK)
            }

            // Extract metadata we stored when creating the PaymentIntent
            string userId = paymentIntent.Metadata["userId"];
            int packageId = int.Parse(paymentIntent.Metadata["packageId"]);

            // Get package details to know scan limit
            Package package = await _repository.GetPackageByIdAsync(packageId);

            if (package != null)
            {
                // Save the transaction record to SQL
                var transaction = new Transaction
                {
                    UserId = userId,
                    PackageId = packageId,
                    StripePaymentId = paymentIntent.Id,
                    Amount = (decimal)paymentIntent.Amount / 100, // Convert back from agorot
                    Currency = paymentIntent.Currency.ToUpper(),
                    Status = "succeeded"
                };

                await _repository.AddTransactionAsync(transaction);

                // Update the user's subscription (UPSERT)
                await _repository.UpsertSubscriptionAsync(userId, packageId, package.ScanLimit);

                if (!string.IsNullOrEmpty(paymentIntent.CustomerId))
                {
                    long invoiceAmount = paymentIntent.AmountReceived > 0
                        ? paymentIntent.AmountReceived
                        : paymentIntent.Amount;

                    _stripeService.CreateInvoiceForPayment(
                        paymentIntent.CustomerId,
                        package.Name,
                        invoiceAmount,
                        paymentIntent.Currency,
                        paymentIntent.Id
                    );
                }
                await _repository.DeletePendingPackageSelectionAsync(userId);
            }
        }

        public async Task ProcessPaymentIntentFailedAsync(PaymentIntent paymentIntent)
        {
            bool alreadyProcessed = await _repository.TransactionExistsAsync(paymentIntent.Id);
            if (alreadyProcessed)
            {
                return;
            }

            string userId = paymentIntent.Metadata.ContainsKey("userId")
                ? paymentIntent.Metadata["userId"] : "unknown";
            int packageId = paymentIntent.Metadata.ContainsKey("packageId")
                ? int.Parse(paymentIntent.Metadata["packageId"]) : 0;

            // Record the failed transaction
            if (packageId > 0)
            {
                var transaction = new Transaction
                {
                    UserId = userId,
                    PackageId = packageId,
                    StripePaymentId = paymentIntent.Id,
                    Amount = (decimal)paymentIntent.Amount / 100,
                    Currency = paymentIntent.Currency?.ToUpper() ?? "ILS",
                    Status = "failed"
                };

                await _repository.AddTransactionAsync(transaction);
            }
        }
    }
}
