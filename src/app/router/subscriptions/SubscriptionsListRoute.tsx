import { getSubscriptionCapabilities, useGrantedAccess } from '@/features/auth';
import { SubscriptionsListPage } from '@/features/subscriptions';

/**
 * Joins the list of subscriptions with the access of the operator: the subscriptions feature does
 * not know `auth`, so the capabilities are worked out here and handed to the screen (research D2).
 */
export function SubscriptionsListRoute() {
  return <SubscriptionsListPage capabilities={getSubscriptionCapabilities(useGrantedAccess())} />;
}
