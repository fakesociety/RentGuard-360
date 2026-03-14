namespace StripePaymentAPI.Models
{
    /// <summary>
    /// Represents a subscription package available for purchase.
    /// Maps to the Packages table in SQL Server.
    /// </summary>
    public class Package
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; }
        public int ScanLimit { get; set; }       // -1 = unlimited
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }
}
