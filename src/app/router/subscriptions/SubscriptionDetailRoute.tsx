import { useParams } from 'react-router';

import { getSubscriptionCapabilities, useGrantedAccess } from '@/features/auth';
import { parseSubscriptionId, SubscriptionDetailPage } from '@/features/subscriptions';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';

/**
 * Joins the detail of a subscription with the access of the operator. The subscriptions feature
 * does not know `auth`, so this is where the capabilities are worked out and handed to the screen
 * (research D2). An address whose id is not one is a page that does not exist.
 */
export function SubscriptionDetailRoute() {
  const access = useGrantedAccess();
  const subscriptionId = parseSubscriptionId(useParams().subscriptionId);

  if (subscriptionId === null) {
    return <NotFoundPage />;
  }
  return (
    <SubscriptionDetailPage
      subscriptionId={subscriptionId}
      capabilities={getSubscriptionCapabilities(access)}
    />
  );
}
