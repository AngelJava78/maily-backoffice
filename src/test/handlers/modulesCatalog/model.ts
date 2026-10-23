import {
  MODULE_ACTION_ID,
  MODULE_ACTION_ORDER,
  MODULE_TYPE,
  type ModuleActionKey,
} from '@/features/modules/schemas/moduleActionCatalog';
import { PROTECTED_MODULE_KEYS } from '@/features/modules/schemas/systemModule';

import {
  descriptionError,
  keyError,
  nameError,
  permissionNameError,
  typeIdError,
} from './validation';

const ACTIVE = 1;
const BLOCKED = 2;
const DELETED = 3;

const STATUS_NAME: Readonly<Record<number, string>> = { [ACTIVE]: 'Activo', [BLOCKED]: 'Bloqueado', [DELETED]: 'Eliminado' };
const TYPE_NAME: Readonly<Record<number, string>> = {
  [MODULE_TYPE.SYSTEM]: 'Sistema',
  [MODULE_TYPE.CLINIC]: 'Clínica',
};
const ACTION_NAME: Readonly<Record<ModuleActionKey, string>> = {
  read: 'Ver',
  write: 'Crear',
  update: 'Modificar',
  delete: 'Eliminar',
};
const ACTION_KEY_BY_ID: ReadonlyMap<number, ModuleActionKey> = new Map(
  MODULE_ACTION_ORDER.map((key) => [MODULE_ACTION_ID[key], key]),
);

/** A module as the simulator keeps it (contracts/modules-service.md). */
export interface CatalogModule {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly statusId: number;
  readonly typeId: number;
}

/** A permission as the simulator keeps it, already resolved against its module and its action. */
export interface CatalogPermission {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly statusId: number;
  readonly moduleId: number | null;
  readonly actionId: number | null;
}

export interface ModuleInput {
  readonly key: string;
  readonly name: string;
  readonly type_id: number;
  readonly description?: string | null;
  readonly sort_order?: number;
}

export interface ModuleChanges {
  readonly name?: string;
  readonly description?: string | null;
  readonly sort_order?: number;
}

export interface PermissionInput {
  readonly name: string;
  readonly description?: string | null;
}

export interface CatalogInitial {
  readonly modules?: readonly CatalogModule[];
  readonly permissions?: readonly CatalogPermission[];
}

export interface CatalogFieldError {
  readonly field: string;
  readonly message: string;
}

export class ModuleCatalogError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly CatalogFieldError[] | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: readonly CatalogFieldError[],
  ) {
    super(message);
    this.name = 'ModuleCatalogError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function validationError(fieldErrors: readonly CatalogFieldError[]): ModuleCatalogError {
  return new ModuleCatalogError(
    422,
    'validation_error',
    'Hay datos no válidos en la solicitud.',
    fieldErrors,
  );
}

export function moduleNotFoundError(id: number | string): ModuleCatalogError {
  return new ModuleCatalogError(
    404,
    'module_not_found',
    `No se encontró el módulo con el identificador ${id}.`,
  );
}

export function permissionNotFoundError(id: number): ModuleCatalogError {
  return new ModuleCatalogError(
    404,
    'permission_not_found',
    `No se encontró el permiso con el identificador ${id}.`,
  );
}

function protectedError(key: string, verb: 'bloquear' | 'eliminar'): ModuleCatalogError {
  return new ModuleCatalogError(
    409,
    'module_protected',
    `El módulo «${key}» es uno de los módulos base de administración y no se puede ${verb}.`,
  );
}

/** An active module of Clínica, without description, whose key and name depend on its id. */
export function catalogModule(overrides: Partial<CatalogModule> = {}): CatalogModule {
  const id = overrides.id ?? 1;
  return {
    id,
    key: `module-${id}`,
    name: `Módulo ${id}`,
    description: null,
    sortOrder: id * 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: ACTIVE,
    typeId: MODULE_TYPE.CLINIC,
    ...overrides,
  };
}

/** An active permission without a resolved module nor action, unless overridden. */
export function catalogPermission(overrides: Partial<CatalogPermission> = {}): CatalogPermission {
  const id = overrides.id ?? 1;
  return {
    id,
    name: `module-${id}:read`,
    description: null,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: ACTIVE,
    moduleId: null,
    actionId: null,
    ...overrides,
  };
}

function resolveActionId(actionKey: string): number | null {
  return (MODULE_ACTION_ORDER as readonly string[]).includes(actionKey)
    ? (MODULE_ACTION_ID[actionKey as ModuleActionKey] ?? null)
    : null;
}

/**
 * Keeps the modules and the permissions of the simulated service (research D13/D14 of this spec),
 * with the rules of contracts/modules-service.md. Imports the fixed catalogs and the protected keys
 * from the real production code (research D4/D9 of 012), never a copy.
 */
export function createModulesCatalogModel(initial: CatalogInitial = {}) {
  const modules = new Map<number, CatalogModule>((initial.modules ?? []).map((item) => [item.id, item]));
  const permissions = new Map<number, CatalogPermission>(
    (initial.permissions ?? []).map((item) => [item.id, item]),
  );
  let nextModuleId = Math.max(0, ...[...modules.keys()]) + 1;
  let nextPermissionId = Math.max(0, ...[...permissions.keys()]) + 1;

  function nonDeletedModules(): CatalogModule[] {
    return [...modules.values()].filter((module) => module.statusId !== DELETED);
  }

  function findActiveModuleByKey(key: string): CatalogModule | undefined {
    return nonDeletedModules().find((module) => module.statusId === ACTIVE && module.key === key);
  }

  function keyInUse(key: string): boolean {
    return nonDeletedModules().some((module) => module.key === key);
  }

  function nameInUse(name: string, excludeId?: number): boolean {
    return nonDeletedModules().some(
      (module) => module.id !== excludeId && module.name.toLowerCase() === name.toLowerCase(),
    );
  }

  function createModule(input: ModuleInput): CatalogModule {
    const fieldErrors = [
      keyError(input.key),
      nameError(input.name),
      typeIdError(input.type_id),
      descriptionError(input.description),
    ].filter((error) => error !== null);
    if (fieldErrors.length > 0) {
      throw validationError(fieldErrors);
    }
    if (keyInUse(input.key)) {
      throw new ModuleCatalogError(
        409,
        'module_key_already_exists',
        `Ya existe un módulo con la key «${input.key}».`,
      );
    }
    if (nameInUse(input.name)) {
      throw new ModuleCatalogError(
        409,
        'module_name_already_exists',
        `Ya existe un módulo con el nombre «${input.name}».`,
      );
    }
    // research D13: the default is the greatest sort_order among ALL non-deleted modules (every
    // type together), never scoped to the type being created.
    const sortOrder =
      input.sort_order ?? Math.max(0, ...nonDeletedModules().map((module) => module.sortOrder)) + 10;
    const id = nextModuleId;
    nextModuleId += 1;
    const created: CatalogModule = {
      id,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      sortOrder,
      createdAt: new Date().toISOString(),
      statusId: ACTIVE,
      typeId: input.type_id,
    };
    modules.set(id, created);
    return created;
  }

  function updateModule(id: number, changes: ModuleChanges): CatalogModule {
    const current = modules.get(id);
    if (current === undefined || current.statusId !== ACTIVE) {
      throw moduleNotFoundError(id);
    }
    const fieldErrors = [
      changes.name === undefined ? null : nameError(changes.name),
      changes.description === undefined ? null : descriptionError(changes.description),
    ].filter((error) => error !== null);
    if (fieldErrors.length > 0) {
      throw validationError(fieldErrors);
    }
    if (changes.name !== undefined && nameInUse(changes.name, id)) {
      throw new ModuleCatalogError(
        409,
        'module_name_already_exists',
        `Ya existe un módulo con el nombre «${changes.name}».`,
      );
    }
    const updated: CatalogModule = {
      ...current,
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.description === undefined ? {} : { description: changes.description }),
      ...(changes.sort_order === undefined ? {} : { sortOrder: changes.sort_order }),
    };
    modules.set(id, updated);
    return updated;
  }

  function blockModule(id: number): CatalogModule {
    const current = modules.get(id);
    if (current === undefined || current.statusId === DELETED) {
      throw moduleNotFoundError(id);
    }
    if (PROTECTED_MODULE_KEYS.includes(current.key)) {
      throw protectedError(current.key, 'bloquear');
    }
    if (current.statusId === BLOCKED) {
      throw new ModuleCatalogError(
        409,
        'module_already_blocked',
        `El módulo con el identificador ${id} ya está bloqueado.`,
      );
    }
    const updated = { ...current, statusId: BLOCKED };
    modules.set(id, updated);
    return updated;
  }

  function unblockModule(id: number): CatalogModule {
    const current = modules.get(id);
    if (current === undefined || current.statusId === DELETED) {
      throw moduleNotFoundError(id);
    }
    if (current.statusId === ACTIVE) {
      throw new ModuleCatalogError(
        409,
        'module_already_active',
        `El módulo con el identificador ${id} ya está activo.`,
      );
    }
    const updated = { ...current, statusId: ACTIVE };
    modules.set(id, updated);
    return updated;
  }

  function deleteModule(id: number): void {
    const current = modules.get(id);
    if (current === undefined || current.statusId === DELETED) {
      throw moduleNotFoundError(id);
    }
    if (PROTECTED_MODULE_KEYS.includes(current.key)) {
      throw protectedError(current.key, 'eliminar');
    }
    modules.set(id, { ...current, statusId: DELETED });
    for (const permission of permissions.values()) {
      if (permission.moduleId === id && permission.statusId !== DELETED) {
        permissions.set(permission.id, { ...permission, statusId: DELETED });
      }
    }
  }

  function listModules(
    options: { readonly statusId?: number; readonly typeId?: number } = {},
  ): CatalogModule[] {
    const statusId = options.statusId ?? ACTIVE;
    return [...modules.values()]
      .filter((module) => module.statusId === statusId)
      .filter((module) => options.typeId === undefined || module.typeId === options.typeId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  function activePermissionsCountOf(moduleId: number): number {
    return [...permissions.values()].filter(
      (permission) => permission.moduleId === moduleId && permission.statusId === ACTIVE,
    ).length;
  }

  function createPermission(input: PermissionInput): CatalogPermission {
    const nameFieldError = permissionNameError(input.name);
    if (nameFieldError !== null) {
      throw validationError([nameFieldError]);
    }
    const nonDeleted = [...permissions.values()].filter((permission) => permission.statusId !== DELETED);
    if (nonDeleted.some((permission) => permission.name === input.name)) {
      throw new ModuleCatalogError(
        409,
        'permission_name_already_exists',
        `Ya existe un permiso con el nombre «${input.name}».`,
      );
    }
    const [resourceKey = '', actionKey = ''] = input.name.split(':');
    const module = findActiveModuleByKey(resourceKey);
    const id = nextPermissionId;
    nextPermissionId += 1;
    const created: CatalogPermission = {
      id,
      name: input.name,
      description: input.description ?? null,
      createdAt: new Date().toISOString(),
      statusId: ACTIVE,
      moduleId: module?.id ?? null,
      actionId: resolveActionId(actionKey),
    };
    permissions.set(id, created);
    return created;
  }

  function deletePermission(id: number): void {
    const current = permissions.get(id);
    if (current === undefined || current.statusId !== ACTIVE) {
      throw permissionNotFoundError(id);
    }
    permissions.set(id, { ...current, statusId: DELETED });
  }

  function listPermissions(): CatalogPermission[] {
    return [...permissions.values()]
      .filter((permission) => permission.statusId === ACTIVE)
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  function toModuleDto(module: CatalogModule) {
    return {
      id: module.id,
      key: module.key,
      name: module.name,
      description: module.description,
      sort_order: module.sortOrder,
      created_at: module.createdAt,
      status: { id: module.statusId, name: STATUS_NAME[module.statusId] ?? '' },
      type: { id: module.typeId, name: TYPE_NAME[module.typeId] ?? '' },
      active_permissions_count: activePermissionsCountOf(module.id),
    };
  }

  function toPermissionDto(permission: CatalogPermission) {
    const module = permission.moduleId === undefined || permission.moduleId === null
      ? null
      : modules.get(permission.moduleId);
    const actionKey = permission.actionId === null ? null : (ACTION_KEY_BY_ID.get(permission.actionId) ?? null);
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      created_at: permission.createdAt,
      status: { id: permission.statusId, name: STATUS_NAME[permission.statusId] ?? '' },
      module:
        module === undefined || module === null
          ? null
          : {
              id: module.id,
              key: module.key,
              name: module.name,
              type: { id: module.typeId, name: TYPE_NAME[module.typeId] ?? '' },
            },
      action:
        actionKey === null
          ? null
          : { id: permission.actionId, key: actionKey, name: ACTION_NAME[actionKey] },
    };
  }

  return {
    createModule,
    updateModule,
    blockModule,
    unblockModule,
    deleteModule,
    listModules,
    findModule: (id: number) => modules.get(id),
    findActiveModuleByKey,
    activePermissionsCountOf,
    toModuleDto,
    createPermission,
    deletePermission,
    listPermissions,
    findPermission: (id: number) => permissions.get(id),
    toPermissionDto,

    // Prepare the data of a test; they apply no rule of the API.
    addModule(module: CatalogModule): void {
      modules.set(module.id, module);
      if (module.id >= nextModuleId) {
        nextModuleId = module.id + 1;
      }
    },
    addPermission(permission: CatalogPermission): void {
      permissions.set(permission.id, permission);
      if (permission.id >= nextPermissionId) {
        nextPermissionId = permission.id + 1;
      }
    },
  };
}

export type ModulesCatalogModel = ReturnType<typeof createModulesCatalogModel>;
