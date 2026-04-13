using Stripe;

namespace StripePaymentAPI.Services
{
    public interface IPaymentProcessingService
    {
        void ProcessPaymentIntentSucceeded(PaymentIntent paymentIntent);
        void ProcessPaymentIntentFailed(PaymentIntent paymentIntent);
    }
}
