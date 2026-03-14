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
        // Connection string to the SQL Server database (injected via DI)
        private readonly string _connectionString;

        /// <summary>
        /// Constructor - receives the connection string from configuration.
        /// The controller never creates this directly (DI handles it).
        /// </summary>
        public SQLPaymentRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("PaymentsDB");
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
                SqlCommand command = new SqlCommand(
                    "SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive " +
                    "FROM Packages WHERE IsActive = 1", connection);

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
                SqlCommand command = new SqlCommand(
                    "SELECT Id, Name, Price, Currency, ScanLimit, Description, IsActive " +
                    "FROM Packages WHERE Id = @Id", connection);

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
                SqlCommand command = new SqlCommand(
                    "INSERT INTO Transactions (UserId, PackageId, StripePaymentId, Amount, Currency, Status) " +
                    "OUTPUT INSERTED.Id, INSERTED.CreatedAt " +
                    "VALUES (@UserId, @PackageId, @StripePaymentId, @Amount, @Currency, @Status)",
                    connection);

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
                SqlCommand command = new SqlCommand(
                    "SELECT Id, UserId, PackageId, StripePaymentId, Amount, Currency, Status, CreatedAt " +
                    "FROM Transactions WHERE UserId = @UserId ORDER BY CreatedAt DESC", connection);

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
                SqlCommand command = new SqlCommand(
                    "SELECT Id, UserId, PackageId, ScansRemaining, UpdatedAt " +
                    "FROM UserSubscriptions WHERE UserId = @UserId", connection);

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
        /// SQL MERGE (UPSERT) - creates or updates a user's subscription.
        /// If the user already has a subscription row, updates it.
        /// If not, inserts a new row.
        /// </summary>
        public UserSubscription UpsertSubscription(string userId, int packageId, int scansRemaining)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                // MERGE = UPSERT: insert if not exists, update if exists
                SqlCommand command = new SqlCommand(
                    "MERGE UserSubscriptions AS target " +
                    "USING (SELECT @UserId AS UserId) AS source " +
                    "ON target.UserId = source.UserId " +
                    "WHEN MATCHED THEN " +
                    "    UPDATE SET PackageId = @PackageId, ScansRemaining = @ScansRemaining, UpdatedAt = GETDATE() " +
                    "WHEN NOT MATCHED THEN " +
                    "    INSERT (UserId, PackageId, ScansRemaining) VALUES (@UserId, @PackageId, @ScansRemaining);",
                    connection);

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
        /// SQL UPDATE - deducts one scan credit from the user.
        /// Returns false if no subscription exists or no scans left.
        /// Does NOT deduct for unlimited plans (ScansRemaining = -1).
        /// </summary>
        public bool DeductScan(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                // First check if user has unlimited scans
                SqlCommand checkCommand = new SqlCommand(
                    "SELECT ScansRemaining FROM UserSubscriptions WHERE UserId = @UserId",
                    connection);
                checkCommand.Parameters.AddWithValue("@UserId", userId);

                connection.Open();
                object result = checkCommand.ExecuteScalar();

                if (result == null)
                    return false; // No subscription found

                int scansRemaining = (int)result;

                // Unlimited plan - always allow, don't deduct
                if (scansRemaining == -1)
                    return true;

                // No scans left
                if (scansRemaining <= 0)
                    return false;

                // Deduct one scan
                SqlCommand deductCommand = new SqlCommand(
                    "UPDATE UserSubscriptions SET ScansRemaining = ScansRemaining - 1, UpdatedAt = GETDATE() " +
                    "WHERE UserId = @UserId AND ScansRemaining > 0",
                    connection);
                deductCommand.Parameters.AddWithValue("@UserId", userId);

                int rowsAffected = deductCommand.ExecuteNonQuery();
                return rowsAffected > 0;
            }
        }
    }
}
