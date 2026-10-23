import { getRoleCapabilities, useGrantedAccess } from '@/features/auth';
import { RolesPage } from '@/features/roles';

/**
 * Joins the Roles y permisos screen with the access of the operator: the roles feature does not
 * know `auth`, so the capabilities are worked out here and handed to the screen (research D2,
 * same pattern as the other sections).
 */
export function RolesRoute() {
  return <RolesPage capabilities={getRoleCapabilities(useGrantedAccess())} />;
}
