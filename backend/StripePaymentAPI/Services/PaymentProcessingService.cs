using Stripe;
using StripePaymentAPI.Models;
using StripePaymentAPI.Repositories;
using System.Collections.Generic;

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

        public void ProcessPaymentIntentSucceeded(PaymentIntent paymentIntent)
        {
            // Extract metadata we stored when creating the PaymentIntent
            string userId = paymentIntent.Metadata["userId"];
            int packageId = int.Parse(paymentIntent.Metadata["packageId"]);

            // Get package details to know scan limit
            Package package = _repository.GetPackageById(packageId);

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

                _repository.AddTransaction(transaction);

                // Update the user's subscription (UPSERT)
                _repository.UpsertSubscription(userId, packageId, package.ScanLimit);

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
                _repository.DeletePendingPackageSelection(userId);
            }
        }

        public void ProcessPaymentIntentFailed(PaymentIntent paymentIntent)
        {
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

                _repository.AddTransaction(transaction);
            }
        }
    }
}
