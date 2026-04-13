namespace StripePaymentAPI.Models.Requests
{
    public class CreateIntentRequest
    {
        public string UserId { get; set; }
        public int PackageId { get; set; }
        public string Action { get; set; } // "create" or "confirm"
        public string PaymentIntentId { get; set; } // Used when Action == "confirm"
        public string Email { get; set; }
        public string Name { get; set; }
    }
}
