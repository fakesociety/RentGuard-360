using System.Collections.Generic;
using System.Threading.Tasks;
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
        Task<List<Package>> GetAllPackagesAsync();

        /// <summary>
        /// Retrieves a specific package by its ID.
        /// Returns null if the package does not exist.
        /// </summary>
        Task<Package> GetPackageByIdAsync(int id);

        // =====================================================================
        // TRANSACTIONS - Payment history (Stripe receipts)
        // =====================================================================

        /// <summary>
        /// Adds a new transaction record after a successful Stripe payment.
        /// Returns the created transaction with its generated ID.
        /// </summary>
        Task<Transaction> AddTransactionAsync(Transaction transaction);

        /// <summary>
        /// Retrieves all transactions for a specific user (by Cognito sub).
        /// </summary>
        Task<List<Transaction>> GetTransactionsByUserIdAsync(string userId);

        /// <summary>
        /// Checks if a transaction with the given Stripe Payment ID already exists.
        /// Useful for idempotency checks in Webhooks.
        /// </summary>
        Task<bool> TransactionExistsAsync(string stripePaymentId);

        // =====================================================================
        // USER SUBSCRIPTIONS - Current plan & remaining credits
        // =====================================================================

        /// <summary>
        /// Retrieves the current subscription for a specific user.
        /// Returns null if the user has no subscription.
        /// </summary>
        Task<UserSubscription> GetSubscriptionByUserIdAsync(string userId);

        /// <summary>
        /// Creates or updates a user's subscription.
        /// If the user already has a subscription, it updates it (UPSERT).
        /// Returns the created/updated subscription.
        /// </summary>
        Task<UserSubscription> UpsertSubscriptionAsync(string userId, int packageId, int scansRemaining);

        /// <summary>
        /// Deducts one scan credit from the user's subscription.
        /// Returns true if successful, false if no scans remaining.
        /// Does NOT deduct if the user has unlimited scans (ScansRemaining = -1).
        /// </summary>
        Task<bool> DeductScanAsync(string userId);

        /// <summary>
        /// Deletes the user's active subscription row.
        /// Returns true when a row was deleted, false when no subscription existed.
        /// </summary>
        Task<bool> DeleteSubscriptionByUserIdAsync(string userId);

        /// <summary>
        /// Creates or updates the user's pending package selection before payment is completed.
        /// </summary>
        Task UpsertPendingPackageSelectionAsync(string userId, int packageId, string paymentIntentId);

        /// <summary>
        /// Removes the user's pending package selection after successful activation/payment.
        /// </summary>
        Task DeletePendingPackageSelectionAsync(string userId);

        /// <summary>
        /// Retrieves the user's pending package selection (if any).
        /// </summary>
        Task<PendingPackageSelection> GetPendingPackageSelectionByUserIdAsync(string userId);
    }
}
