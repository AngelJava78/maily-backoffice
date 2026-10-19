import { useParams } from 'react-router';

import { getUserCapabilities, useGrantedAccess } from '@/features/auth';
import { parseUserId, UserDetailPage } from '@/features/users';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';

/**
 * Joins the detail of a user with the access of the operator. The users feature does not know
 * `auth`, so this is where the capabilities and the id of the operator are worked out and handed
 * to the screen (research D2). An address whose id is not a number is a page that does not exist.
 */
export function UserDetailRoute() {
  const access = useGrantedAccess();
  const userId = parseUserId(useParams().userId);

  if (userId === null) {
    return <NotFoundPage />;
  }
  return (
    <UserDetailPage
      userId={userId}
      operatorUserId={access.user.id}
      capabilities={getUserCapabilities(access)}
    />
  );
}
