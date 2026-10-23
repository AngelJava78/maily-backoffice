import { DirectoryError, type DirectoryModel, type DirectoryRole } from '../usersDirectory/model';

const ACTIVE = 1;

const TYPE_NAMES: ReadonlyMap<number, string> = new Map([
  [1, 'Sistema'],
  [2, 'Clínica'],
]);

/** The four actions a permission name can end with (`recurso:accion`); any other key resolves to
 * no action at all, the same way an unmatched resource resolves to no module (research D3). */
const ACTIONS: ReadonlyMap<string, { id: number; name: string }> = new Map([
  ['read', { id: 1, name: 'Ver' }],
  ['write', { id: 2, name: 'Crear' }],
  ['update', { id: 3, name: 'Modificar' }],
  ['delete', { id: 4, name: 'Eliminar' }],
]);

export interface ModuleRecord {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly typeId: number;
  readonly sortOrder: number;
  readonly statusId: number;
}

export interface PermissionRecord {
  readonly id: number;
  readonly name: string;
}

export interface ResolvedModule {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly type: { readonly id: number; readonly name: string };
}

export interface ResolvedAction {
  readonly id: number;
  readonly key: string;
  readonly name: string;
}

export interface ResolvedPermission {
  readonly id: number;
  readonly name: string;
  readonly module: ResolvedModule | null;
  readonly action: ResolvedAction | null;
}

function typeOf(typeId: number): { id: number; name: string } {
  return { id: typeId, name: TYPE_NAMES.get(typeId) ?? 'Desconocido' };
}

const permissionNotFound = (): DirectoryError =>
  new DirectoryError(404, 'permission_not_found', 'El permiso no existe o no está activo.');

const roleNotFound = (): DirectoryError =>
  new DirectoryError(404, 'role_not_found', 'El role no existe o no está activo.');

/** Looks up a role fresh on every call (never a snapshot kept across two operations), the same
 * way a new HTTP request would: avoids associating/disassociating against stale data. */
function getActiveRole(directoryModel: DirectoryModel, roleId: number): DirectoryRole {
  const role = directoryModel.findRole(roleId);
  if (role?.statusId !== 1) {
    throw roleNotFound();
  }
  return role;
}

const byName = (a: { readonly name: string }, b: { readonly name: string }): number =>
  a.name.localeCompare(b.name);

/**
 * The catalog of modules and permissions (research D3, D8): it does not keep its own list of
 * roles — it receives the `DirectoryModel` of `usersDirectory` wherever a role is involved, so
 * there is a single source of truth for "which roles exist" and "what a role can do"
 * (`role.permissions`, the same flat names the capability system already reads).
 */
export function createRolesCatalogModel(
  initialModules: readonly ModuleRecord[],
  initialPermissions: readonly PermissionRecord[],
) {
  let modules: ModuleRecord[] = [...initialModules];
  let permissions: PermissionRecord[] = [...initialPermissions];

  function findPermission(id: number): PermissionRecord | undefined {
    return permissions.find((permission) => permission.id === id);
  }

  function nextId(items: readonly { readonly id: number }[]): number {
    return items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1;
  }

  /** Resolves `module`/`action` from `permission.name` against the modules active right now. */
  function resolve(permission: PermissionRecord): ResolvedPermission {
    const [resource, actionKey] = permission.name.split(':');
    const moduleRecord = modules.find(
      (module) => module.key === resource && module.statusId === ACTIVE,
    );
    const actionRecord = actionKey === undefined ? undefined : ACTIONS.get(actionKey);
    return {
      id: permission.id,
      name: permission.name,
      module:
        moduleRecord === undefined
          ? null
          : {
              id: moduleRecord.id,
              key: moduleRecord.key,
              name: moduleRecord.name,
              type: typeOf(moduleRecord.typeId),
            },
      action:
        actionRecord === undefined || actionKey === undefined
          ? null
          : { id: actionRecord.id, key: actionKey, name: actionRecord.name },
    };
  }

  return {
    // --- Queries ---
    modules: (): readonly ModuleRecord[] => modules,

    listModules(typeId: number): ModuleRecord[] {
      return modules
        .filter((module) => module.typeId === typeId && module.statusId === ACTIVE)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    },

    listPermissions(): ResolvedPermission[] {
      return [...permissions].sort(byName).map(resolve);
    },

    findResolvedPermission(id: number): ResolvedPermission | undefined {
      const permission = findPermission(id);
      return permission === undefined ? undefined : resolve(permission);
    },

    /** The permissions a role has, resolved and limited to modules of `typeId` (FR-006). */
    permissionsOfRole(role: DirectoryRole, typeId: number): ResolvedPermission[] {
      return role.permissions
        .map((name) => permissions.find((permission) => permission.name === name))
        .filter((permission): permission is PermissionRecord => permission !== undefined)
        .map(resolve)
        .filter((permission) => permission.module?.type.id === typeId)
        .sort(byName);
    },

    // --- Operations that apply the rules of the service ---

    /**
     * Grants permission `permissionId` to the active role `roleId`, via the directory model's
     * `grant` (research D8); returns the role as it is right after (same name and type, read back
     * so the caller never needs a second, possibly-missing lookup of its own). Looks up the role
     * fresh, never from a snapshot the caller might hold.
     */
    associate(
      directoryModel: DirectoryModel,
      roleId: number,
      permissionId: number,
    ): { role: DirectoryRole; permission: ResolvedPermission } {
      const role = getActiveRole(directoryModel, roleId);
      const permission = findPermission(permissionId);
      if (permission === undefined) {
        throw permissionNotFound();
      }
      const resolved = resolve(permission);
      if (resolved.module !== null && resolved.module.type.id !== role.typeId) {
        throw new DirectoryError(
          409,
          'role_permission_module_type_conflict',
          `No se puede asociar el permiso ${permission.name}, del módulo ${resolved.module.name}, al role ${role.name}.`,
        );
      }
      if (role.permissions.includes(permission.name)) {
        throw new DirectoryError(
          409,
          'role_permission_already_associated',
          `El permiso ${permission.name} ya está asociado al role ${role.name}.`,
        );
      }
      directoryModel.grant(role.name, permission.name);
      return {
        role: { ...role, permissions: [...role.permissions, permission.name] },
        permission: resolved,
      };
    },

    /** Revokes permission `permissionId` from the active role `roleId`, via the directory model's
     * `revoke`; same fresh lookup as `associate`. */
    disassociate(directoryModel: DirectoryModel, roleId: number, permissionId: number): void {
      const role = getActiveRole(directoryModel, roleId);
      const permission = findPermission(permissionId);
      if (permission === undefined) {
        throw permissionNotFound();
      }
      if (!role.permissions.includes(permission.name)) {
        throw new DirectoryError(
          409,
          'role_permission_not_associated',
          `El permiso ${permission.name} no está asociado al role ${role.name}.`,
        );
      }
      directoryModel.revoke(role.name, permission.name);
    },

    // --- Helpers to prepare the data of a test, which apply no rule ---

    addModule: (
      overrides: Partial<ModuleRecord> & Pick<ModuleRecord, 'key' | 'name'>,
    ): ModuleRecord => {
      const module: ModuleRecord = {
        id: overrides.id ?? nextId(modules),
        typeId: 1,
        sortOrder: modules.length * 10 + 10,
        statusId: ACTIVE,
        ...overrides,
      };
      modules = [...modules, module];
      return module;
    },

    addPermission: (
      overrides: Partial<PermissionRecord> & Pick<PermissionRecord, 'name'>,
    ): PermissionRecord => {
      const permission: PermissionRecord = {
        id: overrides.id ?? nextId(permissions),
        ...overrides,
      };
      permissions = [...permissions, permission];
      return permission;
    },
  };
}

export type RolesCatalogModel = ReturnType<typeof createRolesCatalogModel>;
