using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using StripePaymentAPI.Models;

namespace StripePaymentAPI.Services
{
    public class UserValidationResult
    {
        public bool IsValid { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsMissingContext { get; set; }
        public string ErrorMessage { get; set; }
    }

    public interface ISubscriptionService
    {
        string GetAuthenticatedUserId(ClaimsPrincipal user);
        HashSet<string> GetAuthenticatedUserAliases(ClaimsPrincipal user);
        bool IsAdminCaller(ClaimsPrincipal user);
        UserValidationResult ValidateUserAccess(ClaimsPrincipal user, string requestedUserId);
        UserValidationResult EnsureAdminAccess(ClaimsPrincipal user);
        Task<UserSubscription> ResolveSubscriptionWithAliasesAsync(ClaimsPrincipal user, string requestedUserId);
    }
}
