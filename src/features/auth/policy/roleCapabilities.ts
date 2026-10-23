import type { RoleCapabilities } from '@/features/roles';

import { can } from './permissions';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/** What the operator may do in Roles y permisos (feature 014); every decision goes through `can()`,
 * which already requires `roles:read` before any other action on roles. */
export function getRoleCapabilities(access: PermissionHolder): RoleCapabilities {
  return {
    canCreate: can(access, { resource: 'roles', action: 'write' }),
    canEdit: can(access, { resource: 'roles', action: 'update' }),
    canDelete: can(access, { resource: 'roles', action: 'delete' }),
  };
}
