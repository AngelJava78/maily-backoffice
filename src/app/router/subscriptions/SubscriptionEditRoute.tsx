import { useParams } from 'react-router';

import { getSubscriptionCapabilities, useGrantedAccess } from '@/features/auth';
import { parseSubscriptionId, SubscriptionEditPage } from '@/features/subscriptions';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';
import { RequireCapability } from '../RequireCapability';

/**
 * Modifying a subscription needs `subscriptions:update` (FR-013). Without it the person goes back to
 * the detail with a notice, and the same happens if they lose it while the form is open. An address
 * whose id is not one is a page that does not exist. The API still checks every call.
 */
export function SubscriptionEditRoute() {
  const { canEdit } = getSubscriptionCapabilities(useGrantedAccess());
  const subscriptionId = parseSubscriptionId(useParams().subscriptionId);

  if (subscriptionId === null) {
    return <NotFoundPage />;
  }
  return (
    <RequireCapability allowed={canEdit} to={`/subscriptions/${subscriptionId}`}>
      <SubscriptionEditPage subscriptionId={subscriptionId} />
    </RequireCapability>
  );
}
