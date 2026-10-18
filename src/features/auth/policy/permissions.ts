/** Resources that have a section in the backoffice (clarification 3). */
export const SECTION_RESOURCES = ['users', 'subscriptions', 'tenants'] as const;

export type PermissionResource = (typeof SECTION_RESOURCES)[number];

/** Interface action -> permission: view = read, create = write, modify = update, delete = delete. */
export type PermissionAction = 'read' | 'write' | 'update' | 'delete';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * The single place that decides whether an action is allowed (constitution V). Seeing a section
 * needs `read`; without it no other action of that section is offered.
 */
export function can(
  access: PermissionHolder,
  permission: { readonly resource: PermissionResource; readonly action: PermissionAction },
): boolean {
  const { resource, action } = permission;
  if (!access.permissions.has(`${resource}:read`)) {
    return false;
  }
  return action === 'read' || access.permissions.has(`${resource}:${action}`);
}

/** Whether at least one known section can be seen, whatever sections are implemented (FR-018). */
export function hasAnySectionPermission(access: PermissionHolder): boolean {
  return SECTION_RESOURCES.some((resource) => access.permissions.has(`${resource}:read`));
}
