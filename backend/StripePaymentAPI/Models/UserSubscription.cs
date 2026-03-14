namespace StripePaymentAPI.Models
{
    /// <summary>
    /// Represents a user's current subscription state.
    /// Maps to the UserSubscriptions table in SQL Server.
    /// Tracks which package the user has and how many scans remain.
    /// </summary>
    public class UserSubscription
    {
        public int Id { get; set; }
        public string UserId { get; set; }       // Cognito sub (UUID)
        public int PackageId { get; set; }
        public int ScansRemaining { get; set; }  // -1 = unlimited
        public DateTime UpdatedAt { get; set; }
    }
}
