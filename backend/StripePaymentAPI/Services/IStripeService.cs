using Stripe;

namespace StripePaymentAPI.Services
{
    public interface IStripeService
    {
        Customer GetOrCreateStripeCustomer(string email, string name, string userId);
        void CreateInvoiceForPayment(string customerId, string packageName, long amountInSmallestUnit, string currency, string paymentIntentId);
        PaymentIntent CreatePaymentIntent(long amount, string currency, string customerId, string userId, int packageId, string packageName);
        PaymentIntent GetPaymentIntent(string paymentIntentId);
        Stripe.BillingPortal.Session CreateCustomerPortalSession(string customerId, string returnUrl);
        Event ConstructEvent(string json, string signatureHeader, string webhookSecret);
        object GetAdminStripeSummary();
    }
}
