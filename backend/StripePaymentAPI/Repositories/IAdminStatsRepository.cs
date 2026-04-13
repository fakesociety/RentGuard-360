using System.Collections.Generic;

namespace StripePaymentAPI.Repositories
{
    public interface IAdminStatsRepository
    {
        object GetPlatformOverview();
        List<object> GetSubscriptionsInternal(List<string> userIds);
    }
}
