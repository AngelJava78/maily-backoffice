import { useParams } from 'react-router';

import { getRoleCapabilities, useGrantedAccess } from '@/features/auth';
import { parseRoleId, RoleDetailPage } from '@/features/roles';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';

/**
 * Joins the detail of a role with the access of the operator (feature 027, research D2): the roles
 * feature does not know `auth`, so the capabilities are worked out here and handed to the screen,
 * as `RolesRoute` does for the table. An address whose id is not one is a page that does not exist.
 */
export function RoleDetailRoute() {
  const access = useGrantedAccess();
  const roleId = parseRoleId(useParams().roleId);

  if (roleId === null) {
    return <NotFoundPage />;
  }
  return <RoleDetailPage roleId={roleId} capabilities={getRoleCapabilities(access)} />;
}
