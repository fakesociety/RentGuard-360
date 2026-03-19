using StripePaymentAPI.Models;

namespace StripePaymentAPI.Repositories
{
    /// <summary>
    /// Interface defining all data access operations for the payment system.
    /// Following the Repository Pattern as taught in the course:
    /// - The Controller never accesses the database directly
    /// - This interface defines WHAT operations are available
    /// - The SQLPaymentRepository implements HOW they work
    /// </summary>
    public interface IPaymentRepository
    {
        // =====================================================================
        // PACKAGES - Read operations for subscription plans
        // =====================================================================

        /// <summary>
        /// Retrieves all active subscription packages from the database.
        /// </summary>
        List<Package> GetAllPackages();

        /// <summary>
        /// Retrieves a specific package by its ID.
        /// Returns null if the package does not exist.
        /// </summary>
        Package GetPackageById(int id);

        // =====================================================================
        // TRANSACTIONS - Payment history (Stripe receipts)
        // =====================================================================

        /// <summary>
        /// Adds a new transaction record after a successful Stripe payment.
        /// Returns the created transaction with its generated ID.
        /// </summary>
        Transaction AddTransaction(Transaction transaction);

        /// <summary>
        /// Retrieves all transactions for a specific user (by Cognito sub).
        /// </summary>
        List<Transaction> GetTransactionsByUserId(string userId);

        // =====================================================================
        // USER SUBSCRIPTIONS - Current plan & remaining credits
        // =====================================================================

        /// <summary>
        /// Retrieves the current subscription for a specific user.
        /// Returns null if the user has no subscription.
        /// </summary>
        UserSubscription GetSubscriptionByUserId(string userId);

        /// <summary>
        /// Creates or updates a user's subscription.
        /// If the user already has a subscription, it updates it (UPSERT).
        /// Returns the created/updated subscription.
        /// </summary>
        UserSubscription UpsertSubscription(string userId, int packageId, int scansRemaining);

        /// <summary>
        /// Deducts one scan credit from the user's subscription.
        /// Returns true if successful, false if no scans remaining.
        /// Does NOT deduct if the user has unlimited scans (ScansRemaining = -1).
        /// </summary>
        bool DeductScan(string userId);

        /// <summary>
        /// Deletes the user's active subscription row.
        /// Returns true when a row was deleted, false when no subscription existed.
        /// </summary>
        bool DeleteSubscriptionByUserId(string userId);
    }
}
