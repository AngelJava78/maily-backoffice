import { getUserCapabilities, useGrantedAccess } from '@/features/auth';
import { UserCreatePage } from '@/features/users';

import { RequireCapability } from '../RequireCapability';

/**
 * Creating a user needs three permissions, not only the reading of the section (FR-025). Without
 * them the person goes back to the list with a notice, and the same happens if they lose one while
 * the form is open. The service still checks every call.
 */
export function UserCreateRoute() {
  const { canCreate } = getUserCapabilities(useGrantedAccess());

  return (
    <RequireCapability allowed={canCreate} to="/users">
      <UserCreatePage />
    </RequireCapability>
  );
}
