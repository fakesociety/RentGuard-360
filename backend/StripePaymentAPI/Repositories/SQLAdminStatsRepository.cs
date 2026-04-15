using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;

namespace StripePaymentAPI.Repositories
{
    public class SQLAdminStatsRepository : IAdminStatsRepository
    {
        private readonly string _connectionString;

        public SQLAdminStatsRepository(string connectionString)
        {
            _connectionString = SQLPaymentRepository.ActiveConnectionString ?? connectionString;
        }

        public async Task<object> GetPlatformOverviewAsync()
        {
            decimal totalRevenue = 0m;
            int totalTransactions = 0;
            int successfulTransactions = 0;
            int failedTransactions = 0;
            int activeSubscribers = 0;
            decimal avgOrderValue = 0m;
            List<object> bundleBreakdown = new List<object>();
            List<object> recentTransactions = new List<object>();

            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                return new
                {
                    totalTransactions,
                    successfulTransactions,
                    failedTransactions,
                    totalRevenue,
                    avgOrderValue,
                    activeSubscribers,
                    bundleBreakdown,
                    recentTransactions
                };
            }

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                string overviewSql = @"
SELECT
    COUNT(*) AS TotalTransactions,
    ISNULL(SUM(CASE WHEN Status = 'succeeded' THEN 1 ELSE 0 END), 0) AS SuccessfulTransactions,
    ISNULL(SUM(CASE WHEN Status = 'failed' THEN 1 ELSE 0 END), 0) AS FailedTransactions,
    ISNULL(SUM(CASE WHEN Status = 'succeeded' THEN Amount ELSE 0 END), 0) AS TotalRevenue,
    ISNULL(AVG(CASE WHEN Status = 'succeeded' THEN Amount END), 0) AS AvgOrderValue
FROM Transactions;
SELECT COUNT(*) AS ActiveSubscribers FROM UserSubscriptions;";

                using (SqlCommand cmd = new SqlCommand(overviewSql, connection))
                using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        totalTransactions = Convert.ToInt32(reader["TotalTransactions"]);
                        successfulTransactions = Convert.ToInt32(reader["SuccessfulTransactions"]);
                        failedTransactions = Convert.ToInt32(reader["FailedTransactions"]);
                        totalRevenue = Convert.ToDecimal(reader["TotalRevenue"]);
                        avgOrderValue = Convert.ToDecimal(reader["AvgOrderValue"]);
                    }

                    if (await reader.NextResultAsync() && await reader.ReadAsync())
                    {
                        activeSubscribers = Convert.ToInt32(reader["ActiveSubscribers"]);
                    }
                }

                string bundlesSql = @"
SELECT p.Name, COUNT(*) AS SubscriberCount
FROM Transactions t
JOIN Packages p ON p.Id = t.PackageId
WHERE t.Status = 'succeeded'
GROUP BY p.Name
ORDER BY SubscriberCount DESC;";
                using (SqlCommand cmdBundles = new SqlCommand(bundlesSql, connection))
                using (SqlDataReader bundlesReader = await cmdBundles.ExecuteReaderAsync())
                {
                    while (await bundlesReader.ReadAsync())
                    {
                        bundleBreakdown.Add(new
                        {
                            name = Convert.ToString(bundlesReader["Name"]),
                            count = Convert.ToInt32(bundlesReader["SubscriberCount"])
                        });
                    }
                }

                string recentSql = @"
SELECT TOP 8 t.UserId, p.Name AS BundleName, t.Amount, t.Currency, t.Status, t.CreatedAt
FROM Transactions t
JOIN Packages p ON p.Id = t.PackageId
ORDER BY t.CreatedAt DESC;";
                using (SqlCommand cmdRecent = new SqlCommand(recentSql, connection))
                using (SqlDataReader recentReader = await cmdRecent.ExecuteReaderAsync())
                {
                    while (await recentReader.ReadAsync())
                    {
                        recentTransactions.Add(new
                        {
                            userId = Convert.ToString(recentReader["UserId"]),
                            bundleName = Convert.ToString(recentReader["BundleName"]),
                            amount = Convert.ToDecimal(recentReader["Amount"]),
                            currency = Convert.ToString(recentReader["Currency"]),
                            status = Convert.ToString(recentReader["Status"]),
                            createdAt = Convert.ToDateTime(recentReader["CreatedAt"]).ToString("o")
                        });
                    }
                }
            }

            return new
            {
                totalTransactions,
                successfulTransactions,
                failedTransactions,
                totalRevenue,
                avgOrderValue,
                activeSubscribers,
                bundleBreakdown,
                recentTransactions
            };
        }

        public async Task<List<object>> GetSubscriptionsInternalAsync(List<string> userIds)
        {
            List<object> subscriptions = new List<object>();

            if (userIds == null || userIds.Count == 0 || string.IsNullOrWhiteSpace(_connectionString))
            {
                return subscriptions;
            }

            List<string> distinctUsers = userIds
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .Select(u => u.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(200)
                .ToList();

            if (distinctUsers.Count == 0) return subscriptions;

            HashSet<string> usersWithActiveSubscription = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();

                string inParams = string.Join(",", distinctUsers.Select((_, i) => $"@u{i}"));
                string sql = $@"
SELECT s.UserId, s.PackageId, s.ScansRemaining, s.UpdatedAt, p.Name AS PackageName
FROM UserSubscriptions s
LEFT JOIN Packages p ON p.Id = s.PackageId
WHERE s.UserId IN ({inParams});";

                using (SqlCommand cmd = new SqlCommand(sql, connection))
                {
                    for (int i = 0; i < distinctUsers.Count; i++)
                    {
                        cmd.Parameters.AddWithValue($"@u{i}", distinctUsers[i]);
                    }

                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            int scansRemaining = Convert.ToInt32(reader["ScansRemaining"]);
                            bool isUnlimited = scansRemaining == -1;
                            bool isExpired = !isUnlimited && scansRemaining <= 0;

                            subscriptions.Add(new
                            {
                                userId = Convert.ToString(reader["UserId"]),
                                packageId = Convert.ToInt32(reader["PackageId"]),
                                packageName = Convert.ToString(reader["PackageName"]),
                                scansRemaining,
                                isUnlimited,
                                isExpired,
                                isPending = false,
                                updatedAt = Convert.ToDateTime(reader["UpdatedAt"]).ToString("o")
                            });

                            string activeUserId = Convert.ToString(reader["UserId"]);
                            if (!string.IsNullOrWhiteSpace(activeUserId))
                            {
                                usersWithActiveSubscription.Add(activeUserId);
                            }
                        }
                    }
                }

                List<string> missingUsers = distinctUsers
                    .Where(u => !usersWithActiveSubscription.Contains(u))
                    .ToList();

                if (missingUsers.Count > 0)
                {
                    try
                    {
                        string inPending = string.Join(",", missingUsers.Select((_, i) => $"@p{i}"));
                        string pendingSql = $@"
SELECT ps.UserId, ps.PackageId, ps.PaymentIntentId, ps.SelectedAt, ps.UpdatedAt, p.Name AS PackageName
FROM PendingPackageSelections ps
LEFT JOIN Packages p ON p.Id = ps.PackageId
WHERE ps.UserId IN ({inPending});";

                        using (SqlCommand cmd = new SqlCommand(pendingSql, connection))
                        {
                            for (int i = 0; i < missingUsers.Count; i++)
                            {
                                cmd.Parameters.AddWithValue($"@p{i}", missingUsers[i]);
                            }

                            using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    subscriptions.Add(new
                                    {
                                        userId = Convert.ToString(reader["UserId"]),
                                        packageId = Convert.ToInt32(reader["PackageId"]),
                                        packageName = Convert.ToString(reader["PackageName"]),
                                        scansRemaining = (int?)null,
                                        isUnlimited = false,
                                        isExpired = false,
                                        isPending = true,
                                        paymentIntentId = Convert.ToString(reader["PaymentIntentId"]),
                                        selectedAt = Convert.ToDateTime(reader["SelectedAt"]).ToString("o"),
                                        updatedAt = Convert.ToDateTime(reader["UpdatedAt"]).ToString("o")
                                    });
                                }
                            }
                        }
                    }
                    catch (SqlException)
                    {
                    }
                }
            }

            return subscriptions;
        }
    }
}
