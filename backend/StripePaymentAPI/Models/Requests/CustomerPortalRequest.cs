namespace StripePaymentAPI.Models.Requests
{
    public class CustomerPortalRequest
    {
        public string UserId { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public string ReturnUrl { get; set; }
    }
}
