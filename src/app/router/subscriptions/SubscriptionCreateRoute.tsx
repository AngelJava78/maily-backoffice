import { getSubscriptionCapabilities, useGrantedAccess } from '@/features/auth';
import { SubscriptionCreatePage } from '@/features/subscriptions';

import { RequireCapability } from '../RequireCapability';

/**
 * Creating a subscription needs `subscriptions:write`, not only the reading of the section
 * (FR-013). Without it the person goes back to the list with a notice, and the same happens if
 * they lose it while the form is open. The API still checks every call.
 */
export function SubscriptionCreateRoute() {
  const { canCreate } = getSubscriptionCapabilities(useGrantedAccess());

  return (
    <RequireCapability allowed={canCreate} to="/subscriptions">
      <SubscriptionCreatePage />
    </RequireCapability>
  );
}
