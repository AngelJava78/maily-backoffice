import { getUserCapabilities, useGrantedAccess } from '@/features/auth';
import { UsersListPage } from '@/features/users';

/**
 * Joins the list of users with the access of the operator: the users feature does not know `auth`,
 * so the capabilities are worked out here and handed to the screen (research D2).
 */
export function UsersListRoute() {
  return <UsersListPage capabilities={getUserCapabilities(useGrantedAccess())} />;
}
