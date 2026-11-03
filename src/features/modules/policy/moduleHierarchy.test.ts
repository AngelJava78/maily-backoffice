import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { eligibleParents, submoduleCountOf } from './moduleHierarchy';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'patients',
    name: 'Pacientes',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    parentModule: null,
    actions: new Set(),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

function submodule(id: number, parentId: number, overrides: Partial<SystemModule> = {}) {
  return module({
    id,
    key: `sub_${id}`,
    name: `Submódulo ${id}`,
    parentModule: { id: parentId, key: `parent_${parentId}`, name: `Padre ${parentId}` },
    ...overrides,
  });
}

describe('eligibleParents', () => {
  const patients = module({ id: 1, key: 'patients', name: 'Pacientes', sortOrder: 20 });
  const inventory = module({ id: 2, key: 'inventory', name: 'Inventario', sortOrder: 10 });

  it('offers the top-level modules of the type asked for, as references', () => {
    expect(
      eligibleParents([patients, inventory], { typeId: MODULE_TYPE.CLINIC, excludeModuleId: null }),
    ).toEqual([
      { id: 2, key: 'inventory', name: 'Inventario' },
      { id: 1, key: 'patients', name: 'Pacientes' },
    ]);
  });

  it('leaves out the submodules: there is only one level', () => {
    const list = [patients, submodule(3, 1)];

    expect(eligibleParents(list, { typeId: MODULE_TYPE.CLINIC, excludeModuleId: null })).toEqual([
      { id: 1, key: 'patients', name: 'Pacientes' },
    ]);
  });

  it('leaves out the modules of the other type', () => {
    const reports = module({ id: 4, key: 'reports', name: 'Reportes', typeId: MODULE_TYPE.SYSTEM });

    expect(
      eligibleParents([patients, reports], { typeId: MODULE_TYPE.SYSTEM, excludeModuleId: null }),
    ).toEqual([{ id: 4, key: 'reports', name: 'Reportes' }]);
  });

  it.each(['users', 'roles', 'permissions', 'modules'])(
    'leaves out the protected module %s',
    (key) => {
      const protectedModule = module({ id: 9, key, name: key, typeId: MODULE_TYPE.SYSTEM });

      expect(
        eligibleParents([protectedModule], { typeId: MODULE_TYPE.SYSTEM, excludeModuleId: null }),
      ).toEqual([]);
    },
  );

  it('leaves out the module being edited', () => {
    expect(
      eligibleParents([patients, inventory], { typeId: MODULE_TYPE.CLINIC, excludeModuleId: 1 }),
    ).toEqual([{ id: 2, key: 'inventory', name: 'Inventario' }]);
  });

  it('breaks a tie of order by name', () => {
    const zeta = module({ id: 5, key: 'zeta', name: 'Zeta', sortOrder: 10 });
    const alfa = module({ id: 6, key: 'alfa', name: 'Alfa', sortOrder: 10 });

    expect(
      eligibleParents([zeta, alfa], { typeId: MODULE_TYPE.CLINIC, excludeModuleId: null }).map(
        (parent) => parent.name,
      ),
    ).toEqual(['Alfa', 'Zeta']);
  });

  it('gives nothing for an empty list', () => {
    expect(eligibleParents([], { typeId: MODULE_TYPE.CLINIC, excludeModuleId: null })).toEqual([]);
  });
});

describe('submoduleCountOf', () => {
  const list = [module({ id: 1 }), module({ id: 2 }), submodule(3, 1), submodule(4, 1)];

  it('counts the modules of the list whose parent is the module', () => {
    expect(submoduleCountOf(list, 1)).toBe(2);
  });

  it('is 0 for a module without submodules', () => {
    expect(submoduleCountOf(list, 2)).toBe(0);
  });

  it('is 0 for an id that is not in the list', () => {
    expect(submoduleCountOf(list, 99)).toBe(0);
  });
});
