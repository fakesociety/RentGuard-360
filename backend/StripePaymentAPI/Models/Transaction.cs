namespace StripePaymentAPI.Models
{
    /// <summary>
    /// Represents a single Stripe payment transaction.
    /// Maps to the Transactions table in SQL Server.
    /// </summary>
    public class Transaction
    {
        public int Id { get; set; }
        public string UserId { get; set; }           // Cognito sub (UUID)
        public int PackageId { get; set; }
        public string StripePaymentId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string Status { get; set; }            // succeeded, pending, failed
        public DateTime CreatedAt { get; set; }
    }
}
