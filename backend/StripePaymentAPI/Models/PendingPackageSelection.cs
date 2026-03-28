namespace StripePaymentAPI.Models
{
    /// <summary>
    /// Represents a selected package that has not been converted into an active subscription yet.
    /// </summary>
    public class PendingPackageSelection
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public int PackageId { get; set; }
        public string PaymentIntentId { get; set; }
        public DateTime SelectedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
