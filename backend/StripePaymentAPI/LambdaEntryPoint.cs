namespace StripePaymentAPI
{
    /// <summary>
    /// AWS Lambda entry point.
    /// This class wraps the entire ASP.NET Core Web API so it can run
    /// inside a single AWS Lambda function behind API Gateway.
    /// 
    /// When running locally (dotnet run), this class is NOT used.
    /// When deployed to AWS Lambda, this is the entry point.
    /// 
    /// The package Amazon.Lambda.AspNetCoreServer handles the translation
    /// between API Gateway events and ASP.NET Core HTTP requests/responses.
    /// </summary>
    public class LambdaEntryPoint : Amazon.Lambda.AspNetCoreServer.APIGatewayProxyFunction
    {
        /// <summary>
        /// Called by the Lambda runtime. Sets up the ASP.NET Core host
        /// with the same configuration as Program.cs (DI, CORS, Swagger, etc.)
        /// </summary>
        protected override void Init(IWebHostBuilder builder)
        {
            builder.UseStartup<LambdaStartup>();
        }
    }

    /// <summary>
    /// Startup class used only when running as a Lambda.
    /// Mirrors the configuration from Program.cs.
    /// </summary>
    public class LambdaStartup
    {
        public IConfiguration Configuration { get; }

        public LambdaStartup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // DI - same as Program.cs
            services.AddScoped<Repositories.IPaymentRepository, Repositories.SQLPaymentRepository>();

            // Stripe
            Stripe.StripeConfiguration.ApiKey = Configuration["Stripe:SecretKey"];

            // Controllers + Swagger
            services.AddControllers();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();

            // CORS
            services.AddCors(options =>
            {
                options.AddPolicy("corspolicy", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseCors("corspolicy");
            app.UseRouting();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
