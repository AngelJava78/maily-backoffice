import { useParams } from 'react-router';

import { getUserCapabilities, useGrantedAccess } from '@/features/auth';
import { parseUserId, UserEditPage } from '@/features/users';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';
import { RequireCapability } from './RequireCapability';

/**
 * Editing a user needs `users:update`, and not only the reading of the section (FR-025). Without
 * it the person goes back to the detail of the user with a notice, and the same happens if they
 * lose it while the form is open. The service still checks the change. An address whose id is not
 * a number is a page that does not exist.
 */
export function UserEditRoute() {
  const { canEdit } = getUserCapabilities(useGrantedAccess());
  const userId = parseUserId(useParams().userId);

  if (userId === null) {
    return <NotFoundPage />;
  }
  return (
    <RequireCapability allowed={canEdit} to={`/users/${userId}`}>
      <UserEditPage userId={userId} />
    </RequireCapability>
  );
}
