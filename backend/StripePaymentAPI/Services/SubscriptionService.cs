using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using StripePaymentAPI.Models;
using StripePaymentAPI.Repositories;

namespace StripePaymentAPI.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly IPaymentRepository _repository;

        public SubscriptionService(IPaymentRepository repository)
        {
            _repository = repository;
        }

        public string GetAuthenticatedUserId(ClaimsPrincipal user)
        {
            if (user == null) return null;
            return user.FindFirstValue("sub")
                ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("cognito:username")
                ?? user.FindFirstValue(ClaimTypes.Email);
        }

        public HashSet<string> GetAuthenticatedUserAliases(ClaimsPrincipal user)
        {
            HashSet<string> aliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (user == null) return aliases;

            void AddAlias(string value)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    aliases.Add(value.Trim());
                }
            }

            AddAlias(user.FindFirstValue("sub"));
            AddAlias(user.FindFirstValue(ClaimTypes.NameIdentifier));
            AddAlias(user.FindFirstValue("cognito:username"));
            AddAlias(user.FindFirstValue(ClaimTypes.Email));

            return aliases;
        }

        public bool IsAdminCaller(ClaimsPrincipal user)
        {
            if (user == null) return false;

            IEnumerable<Claim> groupClaims = user.Claims.Where(c =>
                c.Type == "cognito:groups" || c.Type == ClaimTypes.Role);

            foreach (Claim claim in groupClaims)
            {
                string normalized = claim.Value
                    .Replace("[", string.Empty)
                    .Replace("]", string.Empty)
                    .Replace("\"", string.Empty);

                string[] parts = normalized.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Any(p => string.Equals(p, "Admins", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            return false;
        }

        public UserValidationResult ValidateUserAccess(ClaimsPrincipal user, string requestedUserId)
        {
            if (string.IsNullOrWhiteSpace(requestedUserId))
            {
                return new UserValidationResult { IsValid = false, ErrorMessage = "userId is required" };
            }

            HashSet<string> callerAliases = GetAuthenticatedUserAliases(user);
            if (callerAliases.Count == 0)
            {
                return new UserValidationResult { IsValid = false, IsMissingContext = true, ErrorMessage = "Authenticated user context is missing" };
            }

            if (IsAdminCaller(user))
            {
                return new UserValidationResult { IsValid = true, IsAdmin = true };
            }

            if (!callerAliases.Contains(requestedUserId.Trim()))
            {
                return new UserValidationResult { IsValid = false, ErrorMessage = "Forbidden" };
            }

            return new UserValidationResult { IsValid = true };
        }

        public UserValidationResult EnsureAdminAccess(ClaimsPrincipal user)
        {
            if (user?.Identity == null || !user.Identity.IsAuthenticated)
            {
                return new UserValidationResult { IsValid = false, IsMissingContext = true, ErrorMessage = "Authentication required" };
            }

            if (!IsAdminCaller(user))
            {
                return new UserValidationResult { IsValid = false, ErrorMessage = "Forbidden" };
            }

            return new UserValidationResult { IsValid = true, IsAdmin = true };
        }

        public async Task<UserSubscription> ResolveSubscriptionWithAliasesAsync(ClaimsPrincipal user, string requestedUserId)
        {
            IEnumerable<string> candidates = new[] { requestedUserId }
                .Concat(GetAuthenticatedUserAliases(user))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase);

            foreach (string candidate in candidates)
            {
                UserSubscription subscription = await _repository.GetSubscriptionByUserIdAsync(candidate);
                if (subscription == null)
                {
                    continue;
                }

                if (!string.Equals(subscription.UserId, requestedUserId, StringComparison.OrdinalIgnoreCase))
                {
                    // Migrate to the currently requested user identity to prevent future mismatches.
                    UserSubscription newSub = await _repository.UpsertSubscriptionAsync(requestedUserId, subscription.PackageId, subscription.ScansRemaining);
                    await _repository.DeleteSubscriptionByUserIdAsync(subscription.UserId);
                    return newSub;
                }

                return subscription;
            }

            return null;
        }
    }
}
