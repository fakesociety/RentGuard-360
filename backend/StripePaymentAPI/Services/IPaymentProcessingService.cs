using Stripe;
using System.Threading.Tasks;

namespace StripePaymentAPI.Services
{
    public interface IPaymentProcessingService
    {
        Task ProcessPaymentIntentSucceededAsync(PaymentIntent paymentIntent);
        Task ProcessPaymentIntentFailedAsync(PaymentIntent paymentIntent);
    }
}
