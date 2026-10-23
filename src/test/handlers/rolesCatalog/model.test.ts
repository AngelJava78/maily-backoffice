import { describe, expect, it } from 'vitest';

import { createDirectoryModel, directoryRole, directoryUser } from '../usersDirectory/model';
import { createRolesCatalogModel, type ModuleRecord, type PermissionRecord } from './model';

const ACTIVE = 1;
const BLOCKED = 2;

const SYSTEM_TYPE = 1;
const CLINIC_TYPE = 2;

function modules(overrides: readonly Partial<ModuleRecord>[] = []): ModuleRecord[] {
  return overrides.map((module, index) => ({
    id: index + 1,
    key: `module${index + 1}`,
    name: `Module ${index + 1}`,
    typeId: SYSTEM_TYPE,
    sortOrder: (index + 1) * 10,
    statusId: ACTIVE,
    ...module,
  }));
}

function permissions(names: readonly string[]): PermissionRecord[] {
  return names.map((name, index) => ({ id: index + 1, name }));
}

describe('resolving the catalog of permissions', () => {
  it('resolves module and action from the name when both are active', () => {
    const catalog = createRolesCatalogModel(
      modules([{ key: 'patients', name: 'Pacientes', typeId: CLINIC_TYPE }]),
      permissions(['patients:read']),
    );

    expect(catalog.listPermissions()).toEqual([
      {
        id: 1,
        name: 'patients:read',
        module: { id: 1, key: 'patients', name: 'Pacientes', type: { id: CLINIC_TYPE, name: 'Clínica' } },
        action: { id: 1, key: 'read', name: 'Ver' },
      },
    ]);
  });

  it('leaves module null when no active module matches the resource', () => {
    const catalog = createRolesCatalogModel([], permissions(['patients:read']));

    expect(catalog.listPermissions()[0]).toMatchObject({ module: null, action: { key: 'read' } });
  });

  it('leaves module null when the matching module is not active', () => {
    const catalog = createRolesCatalogModel(
      modules([{ key: 'patients', statusId: BLOCKED }]),
      permissions(['patients:read']),
    );

    expect(catalog.listPermissions()[0]?.module).toBeNull();
  });

  it('leaves action null for a second part that is not one of the four known actions', () => {
    const catalog = createRolesCatalogModel(
      modules([{ key: 'patients' }]),
      permissions(['patients:export']),
    );

    expect(catalog.listPermissions()[0]).toMatchObject({ module: { key: 'patients' }, action: null });
  });

  it('sorts the catalog by name', () => {
    const catalog = createRolesCatalogModel([], permissions(['users:write', 'roles:read']));

    expect(catalog.listPermissions().map((permission) => permission.name)).toEqual([
      'roles:read',
      'users:write',
    ]);
  });
});

describe('listModules', () => {
  it('lists only the active modules of the given type, sorted by sortOrder then name', () => {
    const catalog = createRolesCatalogModel(
      [
        { id: 1, key: 'b', name: 'B', typeId: SYSTEM_TYPE, sortOrder: 20, statusId: ACTIVE },
        { id: 2, key: 'a', name: 'A', typeId: SYSTEM_TYPE, sortOrder: 20, statusId: ACTIVE },
        { id: 3, key: 'c', name: 'C', typeId: SYSTEM_TYPE, sortOrder: 10, statusId: ACTIVE },
        { id: 4, key: 'd', name: 'D', typeId: CLINIC_TYPE, sortOrder: 5, statusId: ACTIVE },
        { id: 5, key: 'e', name: 'E', typeId: SYSTEM_TYPE, sortOrder: 5, statusId: BLOCKED },
      ],
      [],
    );

    expect(catalog.listModules(SYSTEM_TYPE).map((module) => module.key)).toEqual(['c', 'a', 'b']);
  });
});

describe('permissionsOfRole', () => {
  it('resolves the flat permission names of a role against the catalog, filtered by type', () => {
    const catalog = createRolesCatalogModel(
      modules([
        { key: 'patients', typeId: CLINIC_TYPE },
        { key: 'users', typeId: SYSTEM_TYPE },
      ]),
      permissions(['patients:read', 'users:read', 'ghost:read']),
    );
    const role = directoryRole({ permissions: ['patients:read', 'users:read', 'ghost:read'] });

    expect(catalog.permissionsOfRole(role, CLINIC_TYPE).map((p) => p.name)).toEqual([
      'patients:read',
    ]);
  });
});

describe('associate', () => {
  function setup() {
    const directory = createDirectoryModel({
      users: [directoryUser({ auth0Id: 'auth0|ana' })],
      roles: [directoryRole({ id: 6, name: 'Doctor', typeId: CLINIC_TYPE, permissions: [] })],
      associations: [],
    });
    const catalog = createRolesCatalogModel(
      modules([{ key: 'patients', typeId: CLINIC_TYPE }, { key: 'users', typeId: SYSTEM_TYPE }]),
      permissions(['patients:read', 'users:read']),
    );
    return { directory, catalog };
  }

  it('grants the permission on the underlying directory model', () => {
    const { directory, catalog } = setup();

    catalog.associate(directory, 6, 1);

    expect(directory.findRole(6)?.permissions).toEqual(['patients:read']);
  });

  it('rejects a permission whose module type does not match the role type, without granting it', () => {
    const { directory, catalog } = setup();

    expect(() => catalog.associate(directory, 6, 2)).toThrow(
      expect.objectContaining({ status: 409, code: 'role_permission_module_type_conflict' }),
    );
    expect(directory.findRole(6)?.permissions).toEqual([]);
  });

  it('rejects a permission already associated', () => {
    const { directory, catalog } = setup();
    catalog.associate(directory, 6, 1);

    expect(() => catalog.associate(directory, 6, 1)).toThrow(
      expect.objectContaining({ status: 409, code: 'role_permission_already_associated' }),
    );
  });

  it('rejects a permission id that does not exist in the catalog', () => {
    const { directory, catalog } = setup();

    expect(() => catalog.associate(directory, 6, 999)).toThrow(
      expect.objectContaining({ status: 404, code: 'permission_not_found' }),
    );
  });

  it('rejects a role that does not exist or is not active, with 404 role_not_found', () => {
    const { directory, catalog } = setup();

    expect(() => catalog.associate(directory, 999, 1)).toThrow(
      expect.objectContaining({ status: 404, code: 'role_not_found' }),
    );
  });
});

describe('disassociate', () => {
  it('revokes the permission on the underlying directory model', () => {
    const directory = createDirectoryModel({
      users: [],
      roles: [directoryRole({ id: 6, name: 'Doctor', permissions: ['patients:read'] })],
      associations: [],
    });
    const catalog = createRolesCatalogModel(modules([{ key: 'patients' }]), permissions(['patients:read']));

    catalog.disassociate(directory, 6, 1);

    expect(directory.findRole(6)?.permissions).toEqual([]);
  });

  it('rejects a permission that was not associated', () => {
    const directory = createDirectoryModel({
      users: [],
      roles: [directoryRole({ id: 6, name: 'Doctor', permissions: [] })],
      associations: [],
    });
    const catalog = createRolesCatalogModel(modules([{ key: 'patients' }]), permissions(['patients:read']));

    expect(() => {
      catalog.disassociate(directory, 6, 1);
    }).toThrow(expect.objectContaining({ status: 409, code: 'role_permission_not_associated' }));
  });
});

describe('the helpers to prepare data', () => {
  it('adds a module and a permission with the next id', () => {
    const catalog = createRolesCatalogModel([], []);

    const module = catalog.addModule({ key: 'patients', name: 'Pacientes', typeId: CLINIC_TYPE });
    const permission = catalog.addPermission({ name: 'patients:read' });

    expect(module.id).toBe(1);
    expect(permission.id).toBe(1);
    expect(catalog.listModules(CLINIC_TYPE)).toHaveLength(1);
    expect(catalog.listPermissions()[0]).toMatchObject({ module: { key: 'patients' } });
  });
});
