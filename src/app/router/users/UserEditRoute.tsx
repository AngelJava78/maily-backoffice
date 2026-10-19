import { useParams } from 'react-router';

import { getUserCapabilities, useGrantedAccess, useRefreshOperatorAccess } from '@/features/auth';
import { parseUserId, UserEditPage } from '@/features/users';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';
import { RequireCapability } from './RequireCapability';

/**
 * Editing a user needs `users:update`, and not only the reading of the section (FR-025). Without
 * it the person goes back to the detail of the user with a notice, and the same happens if they
 * lose it while the form is open. The service still checks the change. An address whose id is not
 * a number is a page that does not exist. When the operator changes their own name, the access is
 * asked for again so that the header and the profile show it.
 */
export function UserEditRoute() {
  const access = useGrantedAccess();
  const refreshOperatorAccess = useRefreshOperatorAccess();
  const { canEdit } = getUserCapabilities(access);
  const userId = parseUserId(useParams().userId);

  if (userId === null) {
    return <NotFoundPage />;
  }
  return (
    <RequireCapability allowed={canEdit} to={`/users/${userId}`}>
      <UserEditPage
        userId={userId}
        onSaved={(saved) => {
          // The header and the profile show the name of the operator as the access check gave it.
          if (saved.id === access.user.id) {
            refreshOperatorAccess();
          }
        }}
      />
    </RequireCapability>
  );
}
