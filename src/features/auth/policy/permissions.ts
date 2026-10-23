/**
 * Resources that have an entry in the navigation: the sections of the product (clarification 3),
 * the Token tool of feature 005 (`token:read`), Módulos (feature 013, `modules:read`) and Roles y
 * permisos (feature 014, `roles:read`) — this last one the same resource feature 002 already used
 * to offer assigning a role to a user, now also its own section to administer roles and their
 * permissions.
 */
export const SECTION_RESOURCES = [
  'modules',
  'roles',
  'users',
  'subscriptions',
  'tenants',
  'token',
] as const;

/**
 * Every resource whose permissions are checked. `dashboard`, the indicators of the Panel (feature
 * 007), has no section of its own: the Panel is the home page, always in the navigation, and the
 * permission only decides whether it shows them.
 */
export const PERMISSION_RESOURCES = [...SECTION_RESOURCES, 'dashboard'] as const;

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
