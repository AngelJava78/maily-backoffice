import type { UserCapabilities } from '@/features/users';

import { can } from './permissions';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * What the operator may do in the users section (feature 002, FR-015 and FR-025). Every decision
 * goes through `can()`, which already requires `users:read` before any other action on users.
 * Creating a user combines three permissions, because the creation needs at least one role:
 * `users:write` to create it, `users:update` to assign the roles and `roles:read` to list them.
 */
export function getUserCapabilities(access: PermissionHolder): UserCapabilities {
  const canUpdate = can(access, { resource: 'users', action: 'update' });
  const canReadRoles = can(access, { resource: 'roles', action: 'read' });
  return {
    canCreate: can(access, { resource: 'users', action: 'write' }) && canUpdate && canReadRoles,
    canEdit: canUpdate,
    canAddRoles: canUpdate && canReadRoles,
    canRemoveRoles: canUpdate,
    canChangeStatus: canUpdate,
    canDelete: can(access, { resource: 'users', action: 'delete' }),
  };
}
