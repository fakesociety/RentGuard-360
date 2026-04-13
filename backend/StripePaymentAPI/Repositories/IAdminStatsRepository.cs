using System.Collections.Generic;
using System.Threading.Tasks;

namespace StripePaymentAPI.Repositories
{
    public interface IAdminStatsRepository
    {
        Task<object> GetPlatformOverviewAsync();
        Task<List<object>> GetSubscriptionsInternalAsync(List<string> userIds);
    }
}
