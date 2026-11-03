import type { RolesStatusFilter } from '../schemas/rolePermissionsLocation';

/**
 * The TanStack Query keys of Roles y permisos (constitution III): written here and nowhere else.
 */
export const roleKeys = {
  all: ['roles'] as const,
  /** The prefix of both lists: invalidating it refreshes the active and the blocked roles at once. */
  lists: () => [...roleKeys.all, 'list'] as const,
  /** The roles of one status (feature 025, research D3), of both types. */
  list: (status: RolesStatusFilter) => [...roleKeys.lists(), status] as const,
  detail: (roleId: number) => [...roleKeys.all, 'detail', roleId] as const,
  permissions: (roleId: number) => [...roleKeys.detail(roleId), 'permissions'] as const,
};

/** The catalog of permissions (shared by every role's matrix): one key, read once. */
export const permissionsCatalogKeys = {
  all: ['rolesPermissionsCatalog'] as const,
};

/** The catalog of modules, one per role type. */
export const modulesCatalogKeys = {
  all: ['rolesModulesCatalog'] as const,
  byType: (typeId: 1 | 2) => [...modulesCatalogKeys.all, typeId] as const,
};

/** The fixed catalog of role types (Clínica/Sistema). */
export const roleTypesCatalogKeys = {
  all: ['roleTypesCatalog'] as const,
};
