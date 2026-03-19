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

            // Cognito JWT auth - same security model as Program.cs
            var cognitoUserPoolId = Configuration["Cognito:UserPoolId"];
            var cognitoRegion = Configuration["Cognito:Region"];
            var cognitoAppClientId = Configuration["Cognito:AppClientId"];

            if (string.IsNullOrWhiteSpace(cognitoUserPoolId) ||
                string.IsNullOrWhiteSpace(cognitoRegion) ||
                string.IsNullOrWhiteSpace(cognitoAppClientId))
            {
                throw new InvalidOperationException("Missing Cognito configuration. Set Cognito:UserPoolId, Cognito:Region, and Cognito:AppClientId.");
            }

            var cognitoAuthority = $"https://cognito-idp.{cognitoRegion}.amazonaws.com/{cognitoUserPoolId}";

            services
                .AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.Authority = cognitoAuthority;
                    options.RequireHttpsMetadata = true;
                    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            string authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                            if (!string.IsNullOrWhiteSpace(authHeader) &&
                                !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                            {
                                context.Token = authHeader;
                            }

                            return Task.CompletedTask;
                        }
                    };
                    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = cognitoAuthority,
                        ValidateAudience = true,
                        ValidAudience = cognitoAppClientId,
                        ValidateLifetime = true,
                        NameClaimType = "sub"
                    };
                });

            services.AddAuthorization();

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
                    var aspnetEnvironment = Configuration["ASPNETCORE_ENVIRONMENT"]
                        ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                        ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                        ?? string.Empty;
                    var isDevelopment = string.Equals(aspnetEnvironment, "Development", StringComparison.OrdinalIgnoreCase);

                    string rawAllowedOrigins = Configuration["Cors:AllowedOrigins"]
                        ?? Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
                        ?? string.Empty;

                    string[] allowedOrigins = rawAllowedOrigins
                        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Where(origin => !string.IsNullOrWhiteSpace(origin))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToArray();

                    if (allowedOrigins.Length == 0)
                    {
                        if (isDevelopment)
                        {
                            policy.WithOrigins(
                                "http://localhost:5173",
                                "http://127.0.0.1:5173",
                                "http://localhost:4173",
                                "http://127.0.0.1:4173",
                                "http://localhost:3000",
                                "http://127.0.0.1:3000");
                        }
                        else
                        {
                            throw new InvalidOperationException(
                                "CORS is not configured. Set Cors:AllowedOrigins or CORS_ALLOWED_ORIGINS for non-development environments.");
                        }
                    }
                    else
                    {
                        policy.WithOrigins(allowedOrigins);
                    }

                    policy.AllowAnyHeader()
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
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
