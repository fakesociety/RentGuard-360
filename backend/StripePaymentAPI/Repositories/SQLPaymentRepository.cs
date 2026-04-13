using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Threading.Tasks;
using StripePaymentAPI.Models;

namespace StripePaymentAPI.Repositories
{
    public class SQLPaymentRepository : IPaymentRepository
    {
        private readonly string _connectionString;
        private static string _activeConnectionString = null;
        private static readonly object _initLock = new object();
        public static string ActiveConnectionString => _activeConnectionString;

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

                        if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                        {
                            allowFallback = false;
                        }

                        try
                        {
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
                                    _activeConnectionString = primary;
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

        public async Task<List<Package>> GetAllPackagesAsync()
        {
            List<Package> packages = new List<Package>();

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetAllPackages", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
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
            }

            return packages;
        }

        public async Task<Package> GetPackageByIdAsync(int id)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetPackageById", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("@Id", id);

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
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
            }
            return null;
        }

        public async Task<Transaction> AddTransactionAsync(Transaction transaction)
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

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        transaction.Id = (int)reader["Id"];
                        transaction.CreatedAt = (DateTime)reader["CreatedAt"];
                    }
                }
            }

            return transaction;
        }

        public async Task<List<Transaction>> GetTransactionsByUserIdAsync(string userId)
        {
            List<Transaction> transactions = new List<Transaction>();

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetTransactionsByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("@UserId", userId);

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        transactions.Add(new Transaction
                        {
                            Id = (int)reader["Id"],
                            UserId = (string)reader["UserId"],
                            PackageId = (int)reader["PackageId"],
                            StripePaymentId = reader["StripePaymentId"] as string,
                            Amount = (decimal)reader["Amount"],
                            Currency = reader["Currency"] as string ?? "ILS",
                            Status = (string)reader["Status"],
                            CreatedAt = (DateTime)reader["CreatedAt"]
                        });
                    }
                }
            }

            return transactions;
        }

        public async Task<bool> TransactionExistsAsync(string stripePaymentId)
        {
            if (string.IsNullOrWhiteSpace(stripePaymentId)) return false;

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("SELECT COUNT(1) FROM Transactions WHERE StripePaymentId = @StripePaymentId", connection);
                command.Parameters.AddWithValue("@StripePaymentId", stripePaymentId);
                
                await connection.OpenAsync();
                int count = (int)await command.ExecuteScalarAsync();
                return count > 0;
            }
        }

        public async Task<UserSubscription> GetSubscriptionByUserIdAsync(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetSubscriptionByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("@UserId", userId);

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
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
            }

            return null;
        }

        public async Task<UserSubscription> UpsertSubscriptionAsync(string userId, int packageId, int scansRemaining)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_UpsertSubscription", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);
                command.Parameters.AddWithValue("@PackageId", packageId);
                command.Parameters.AddWithValue("@ScansRemaining", scansRemaining);

                await connection.OpenAsync();
                await command.ExecuteNonQueryAsync();
            }

            return await GetSubscriptionByUserIdAsync(userId);
        }

        public async Task<bool> DeductScanAsync(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_DeductScan", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                SqlParameter successParam = new SqlParameter("@Success", System.Data.SqlDbType.Bit);
                successParam.Direction = System.Data.ParameterDirection.Output;
                command.Parameters.Add(successParam);

                SqlParameter remainingParam = new SqlParameter("@RemainingScans", System.Data.SqlDbType.Int);
                remainingParam.Direction = System.Data.ParameterDirection.Output;
                command.Parameters.Add(remainingParam);

                await connection.OpenAsync();
                await command.ExecuteNonQueryAsync();

                return (bool)successParam.Value;
            }
        }

        public async Task<bool> DeleteSubscriptionByUserIdAsync(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("DELETE FROM UserSubscriptions WHERE UserId = @UserId", connection);
                command.Parameters.AddWithValue("@UserId", userId);

                await connection.OpenAsync();
                int affectedRows = await command.ExecuteNonQueryAsync();
                return affectedRows > 0;
            }
        }

        public async Task UpsertPendingPackageSelectionAsync(string userId, int packageId, string paymentIntentId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_UpsertPendingPackageSelection", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);
                command.Parameters.AddWithValue("@PackageId", packageId);
                command.Parameters.AddWithValue("@PaymentIntentId", (object)paymentIntentId ?? DBNull.Value);

                await connection.OpenAsync();
                await command.ExecuteNonQueryAsync();
            }
        }

        public async Task DeletePendingPackageSelectionAsync(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_DeletePendingPackageSelection", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@UserId", userId);

                await connection.OpenAsync();
                await command.ExecuteNonQueryAsync();
            }
        }

        public async Task<PendingPackageSelection> GetPendingPackageSelectionByUserIdAsync(string userId)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_GetPendingPackageSelectionByUserId", connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Parameters.AddWithValue("@UserId", userId);

                await connection.OpenAsync();
                using (SqlDataReader reader = await command.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
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
            }

            return null;
        }
    }
}
