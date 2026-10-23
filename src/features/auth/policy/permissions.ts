/**
 * Resources that have an entry in the navigation: the sections of the product (clarification 3) and
 * the Token tool of feature 005, whose only permission is `token:read`.
 */
export const SECTION_RESOURCES = ['modules', 'users', 'subscriptions', 'tenants', 'token'] as const;

/**
 * Every resource whose permissions are checked. The roles are only read, to offer assigning them to
 * a user (feature 002): they are not administered here, so they have no section of their own. Nor
 * has `dashboard`, the indicators of the Panel (feature 007): the Panel is the home page, always in
 * the navigation, and the permission only decides whether it shows them.
 */
export const PERMISSION_RESOURCES = [...SECTION_RESOURCES, 'roles', 'dashboard'] as const;

export type SectionResource = (typeof SECTION_RESOURCES)[number];

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

/** Interface action -> permission: view = read, create = write, modify = update, delete = delete. */
export type PermissionAction = 'read' | 'write' | 'update' | 'delete';

interface PermissionHolder {
  readonly permissions: ReadonlySet<string>;
}

/**
 * The single place that decides whether an action is allowed (constitution V). Seeing a resource
 * needs `read`; without it no other action on that resource is offered.
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

/**
 * Whether the person has anything to see: a known section or tool, whatever sections are
 * implemented (FR-018), or the indicators of the Panel (FR-012 of feature 007). Someone whose only
 * permission is `token:read` or `dashboard:read` has something to use, so they are not told that
 * their role has no permissions.
 */
export function hasAnythingToSee(access: PermissionHolder): boolean {
  return (
    SECTION_RESOURCES.some((resource) => access.permissions.has(`${resource}:read`)) ||
    can(access, { resource: 'dashboard', action: 'read' })
  );
}
