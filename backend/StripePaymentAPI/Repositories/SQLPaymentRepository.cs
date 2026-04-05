using System.Data.SqlClient;
using StripePaymentAPI.Models;

namespace StripePaymentAPI.Repositories
{
    /// <summary>
    /// SQL Server implementation of IPaymentRepository.
    /// Uses raw ADO.NET (SqlConnection, SqlCommand, SqlDataReader) as taught in the course.
    /// This is the Data Access Layer (DAL) - only this class contains SQL logic.
    /// The connection string is injected via IConfiguration (Dependency Injection).
    /// </summary>
    public class SQLPaymentRepository : IPaymentRepository
    {
        // Connection string to the SQL Server database
        private readonly string _connectionString;
        
        // Cache the active connection string so we don't delay every request by 3 seconds if AWS is down
        private static string _activeConnectionString = null;
        private static readonly object _initLock = new object();
        public static string ActiveConnectionString => _activeConnectionString;

        /// <summary>
        /// Constructor - receives the connection string from configuration.
        /// Tries AWS RDS first. If it's down, falls back to LocalDB automatically.
        /// </summary>
        public SQLPaymentRepository(IConfiguration configuration)
        {
            if (_activeConnectionString == null)
            {
                lock (_initLock)
                {
                    if (_activeConnectionString == null)
                    {
                        string primary = configuration.GetConnectionString("PaymentsDB");
                        string fallback = configuration.GetConnectionString("LocalPaymentsDB");
                        bool allowFallback = configuration.GetValue<bool>("Database:AllowLocalFallback", true);

                        // Force disable LocalDB fallback if not running on Windows (since LocalDB is Windows-only)
                        if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                        {
                            allowFallback = false;
                        }

                        try
                        {
                            // Test primary connection with a slightly longer timeout for cold starts
                            var builder = new SqlConnectionStringBuilder(primary) { ConnectTimeout = 3 };
                            using (var connection = new SqlConnection(builder.ConnectionString))
                            {
                                connection.Open();
                            }
                            _activeConnectionString = primary;
                            Console.WriteLine("DB Status: Connected to Primary AWS RDS Database.");
                        }
                        catch (Exception ex)
                        {
                            if (allowFallback)
                            {
                                Console.WriteLine($"DB Status: AWS RDS is down ({ex.Message}). Falling back to LocalDB!");
                                
                                // Test LocalDB to ensure it's awake before accepting it
                                try 
                                {
                                    var fallbackBuilder = new SqlConnectionStringBuilder(fallback) { ConnectTimeout = 15 };
                                    using (var fallbackDb = new SqlConnection(fallbackBuilder.ConnectionString))
                                    {
                                        fallbackDb.Open();
                                    }
                                    _activeConnectionString = fallback;
                                    Console.WriteLine("DB Status: LocalDB successfully awakened and connected.");
                                }
                                catch (Exception localEx)
                                {
                                    Console.WriteLine($"DB Status: LocalDB fallback ALSO failed ({localEx.Message}). Trying to keep primary anyway.");
                                    _activeConnectionString = primary; // Fallback failed too!
                                }
                            }
                            else
                            {
                                Console.WriteLine($"DB Status: AWS RDS is down ({ex.Message}). Fallback disabled. Keeping primary.");
                                _activeConnectionString = primary;
                            }
                        }
                    }
                }
            }

            _connectionString = _activeConnectionString;
        }

        // =====================================================================
        // PACKAGES
        // =====================================================================

        /// <summary>
        /// SQL SELECT - retrieves all active packages from the database.
        /// </summary>
        public List<Package> GetAllPackages()
        {
            List<Package> packages = new List<Package>();

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetAllPackages", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                while (reader.Read())
                {
                    packages.Add(new Package
                    {
                        Id = (int)reader["Id"],
                        Name = (string)reader["Name"],
                        Price = (decimal)reader["Price"],
                        Currency = reader["Currency"] as string ?? "ILS",
                        ScanLimit = (int)reader["ScanLimit"],
                        Description = reader["Description"] as string,
                        IsActive = (bool)reader["IsActive"]
                    });
                }
            }

            return packages;
        }

        /// <summary>
        /// SQL SELECT by ID - retrieves a specific package.
        /// Returns null if not found.
        /// </summary>
        public Package GetPackageById(int id)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetPackageById", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@Id", id);

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                if (reader.Read())
                {
                    return new Package
                    {
                        Id = (int)reader["Id"],
                        Name = (string)reader["Name"],
                        Price = (decimal)reader["Price"],
                        Currency = reader["Currency"] as string ?? "ILS",
                        ScanLimit = (int)reader["ScanLimit"],
                        Description = reader["Description"] as string,
                        IsActive = (bool)reader["IsActive"]
                    };
                }
            }

            return null;
        }

        // =====================================================================
        // TRANSACTIONS
        // =====================================================================

        /// <summary>
        /// SQL INSERT - adds a new payment transaction record.
        /// Returns the transaction with the auto-generated ID.
        /// </summary>
        public Transaction AddTransaction(Transaction transaction)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_AddTransaction", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", transaction.UserId);
                command.Parameters.AddWithValue("@PackageId", transaction.PackageId);
                command.Parameters.AddWithValue("@StripePaymentId", transaction.StripePaymentId);
                command.Parameters.AddWithValue("@Amount", transaction.Amount);
                command.Parameters.AddWithValue("@Currency", transaction.Currency ?? "ILS");
                command.Parameters.AddWithValue("@Status", transaction.Status);

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                if (reader.Read())
                {
                    transaction.Id = (int)reader["Id"];
                    transaction.CreatedAt = (DateTime)reader["CreatedAt"];
                }
            }

            return transaction;
        }

        /// <summary>
        /// SQL SELECT - retrieves all transactions for a specific user.
        /// Ordered by most recent first.
        /// </summary>
        public List<Transaction> GetTransactionsByUserId(string userId)
        {
            List<Transaction> transactions = new List<Transaction>();

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetTransactionsByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                while (reader.Read())
                {
                    transactions.Add(new Transaction
                    {
                        Id = (int)reader["Id"],
                        UserId = (string)reader["UserId"],
                        PackageId = (int)reader["PackageId"],
                        StripePaymentId = (string)reader["StripePaymentId"],
                        Amount = (decimal)reader["Amount"],
                        Currency = reader["Currency"] as string ?? "ILS",
                        Status = (string)reader["Status"],
                        CreatedAt = (DateTime)reader["CreatedAt"]
                    });
                }
            }

            return transactions;
        }

        // =====================================================================
        // USER SUBSCRIPTIONS
        // =====================================================================

        /// <summary>
        /// SQL SELECT - retrieves the user's current subscription.
        /// Returns null if the user has never subscribed.
        /// </summary>
        public UserSubscription GetSubscriptionByUserId(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetSubscriptionByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                if (reader.Read())
                {
                    return new UserSubscription
                    {
                        Id = (int)reader["Id"],
                        UserId = (string)reader["UserId"],
                        PackageId = (int)reader["PackageId"],
                        ScansRemaining = (int)reader["ScansRemaining"],
                        UpdatedAt = (DateTime)reader["UpdatedAt"]
                    };
                }
            }

            return null;
        }

        /// <summary>
        /// SQL UPSERT via stored procedure - creates or updates a user's subscription.
        /// Stored procedure semantics are defined in Repositories/SQL/02_StoredProcedures.sql
        /// </summary>
        public UserSubscription UpsertSubscription(string userId, int packageId, int scansRemaining)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_UpsertSubscription", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);
                command.Parameters.AddWithValue("@PackageId", packageId);
                command.Parameters.AddWithValue("@ScansRemaining", scansRemaining);

                connection.Open();
                command.ExecuteNonQuery();
            }

            // Return the updated/created subscription
            return GetSubscriptionByUserId(userId);
        }

        /// <summary>
        /// Calls stored procedure sp_DeductScan to atomically deduct one scan credit.
        /// Uses OUTPUT parameters to get the result and remaining count.
        /// Returns false if no subscription exists or no scans left.
        /// </summary>
        public bool DeductScan(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_DeductScan", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                // Input parameter
                command.Parameters.AddWithValue("@UserId", userId);

                // Output parameters
                SqlParameter successParam = new SqlParameter("@Success", System.Data.SqlDbType.Bit);
                successParam.Direction = System.Data.ParameterDirection.Output;
                command.Parameters.Add(successParam);

                SqlParameter remainingParam = new SqlParameter("@ScansRemaining", System.Data.SqlDbType.Int);
                remainingParam.Direction = System.Data.ParameterDirection.Output;
                command.Parameters.Add(remainingParam);

                connection.Open();
                command.ExecuteNonQuery();

                return (bool)successParam.Value;
            }
        }

        /// <summary>
        /// SQL DELETE - removes the user's active subscription row.
        /// Used when an admin permanently deletes a user from Cognito.
        /// </summary>
        public bool DeleteSubscriptionByUserId(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("DELETE FROM UserSubscriptions WHERE UserId = @UserId", connection);
                command.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                int affectedRows = command.ExecuteNonQuery();
                return affectedRows > 0;
            }
        }

        /// <summary>
        /// SQL UPSERT via stored procedure - persists selected package before payment completion.
        /// </summary>
        public void UpsertPendingPackageSelection(string userId, int packageId, string paymentIntentId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_UpsertPendingPackageSelection", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);
                command.Parameters.AddWithValue("@PackageId", packageId);
                command.Parameters.AddWithValue("@PaymentIntentId", (object)paymentIntentId ?? DBNull.Value);

                connection.Open();
                command.ExecuteNonQuery();
            }
        }

        /// <summary>
        /// SQL DELETE via stored procedure - removes pending selected package state.
        /// </summary>
        public void DeletePendingPackageSelection(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_DeletePendingPackageSelection", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                command.ExecuteNonQuery();
            }
        }

        /// <summary>
        /// SQL SELECT via stored procedure - retrieves pending selected package state for one user.
        /// </summary>
        public PendingPackageSelection GetPendingPackageSelectionByUserId(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetPendingPackageSelectionByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                SqlDataReader reader = command.ExecuteReader();

                if (reader.Read())
                {
                    return new PendingPackageSelection
                    {
                        Id = (int)reader["Id"],
                        UserId = (string)reader["UserId"],
                        PackageId = (int)reader["PackageId"],
                        PaymentIntentId = reader["PaymentIntentId"] as string,
                        SelectedAt = (DateTime)reader["SelectedAt"],
                        UpdatedAt = (DateTime)reader["UpdatedAt"]
                    };
                }
            }

            return null;
        }
    }
}
