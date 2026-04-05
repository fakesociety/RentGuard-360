using System;
using System.Data.SqlClient;

class Program {
    static void Main() {
        string connStr = "Server=rentguard-payments.cw3wg44u6w5o.us-east-1.rds.amazonaws.com;Database=RentGuardPayments;User Id=admin;Password=Moty123!;Connect Timeout=15";
        try {
            using (var conn = new SqlConnection(connStr)) {
                conn.Open();
                Console.WriteLine("SUCCESS!");
            }
        } catch (Exception ex) {
            Console.WriteLine("ERROR: " + ex.Message);
        }
    }
}
