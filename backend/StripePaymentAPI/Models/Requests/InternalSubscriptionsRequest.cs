using System.Collections.Generic;

namespace StripePaymentAPI.Models.Requests
{
    public class InternalSubscriptionsRequest
    {
        public List<string> UserIds { get; set; }
    }
}
