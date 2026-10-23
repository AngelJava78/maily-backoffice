import { describe, expect, it } from 'vitest';

import {
  catalogModule,
  catalogPermission,
  createModulesCatalogModel,
  ModuleCatalogError,
} from './model';

describe('createModule', () => {
  it('rejects a key already used by a non-deleted module', () => {
    const model = createModulesCatalogModel({ modules: [catalogModule({ id: 1, key: 'audit' })] });

    expect(() =>
      model.createModule({ key: 'audit', name: 'Otro', type_id: 2 }),
    ).toThrowError(expect.objectContaining({ code: 'module_key_already_exists' }));
  });

  it('rejects a name already used, without distinguishing case', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'audit', name: 'Auditoría' })],
    });

    expect(() =>
      model.createModule({ key: 'other', name: 'auditoría', type_id: 2 }),
    ).toThrowError(expect.objectContaining({ code: 'module_name_already_exists' }));
  });

  it('rejects a key with an invalid format', () => {
    const model = createModulesCatalogModel();

    expect(() => model.createModule({ key: 'Audit', name: 'Auditoría', type_id: 2 })).toThrowError(
      expect.objectContaining({ code: 'validation_error' }),
    );
  });

  it('defaults sort_order to the greatest among ALL non-deleted modules, never scoped to the type (research D13)', () => {
    const model = createModulesCatalogModel({
      modules: [
        catalogModule({ id: 1, key: 'users', typeId: 1, sortOrder: 80 }),
        catalogModule({ id: 2, key: 'patients', typeId: 2, sortOrder: 10 }),
      ],
    });

    const created = model.createModule({ key: 'inventory', name: 'Inventario', type_id: 2 });

    expect(created.sortOrder).toBe(90);
  });

  it('creates the module Active, with the data sent', () => {
    const model = createModulesCatalogModel();

    const created = model.createModule({
      key: 'inventory',
      name: 'Inventario',
      type_id: 2,
      description: 'Medicamentos y material.',
    });

    expect(created).toMatchObject({
      key: 'inventory',
      name: 'Inventario',
      typeId: 2,
      description: 'Medicamentos y material.',
      statusId: 1,
    });
  });
});

describe('updateModule', () => {
  it('rejects a module that is not Active', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, statusId: 2 })],
    });

    expect(() => model.updateModule(1, { name: 'Nuevo nombre' })).toThrowError(
      expect.objectContaining({ code: 'module_not_found' }),
    );
  });

  it('applies only the fields sent', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, name: 'Agenda y citas', description: 'x', sortOrder: 20 })],
    });

    const updated = model.updateModule(1, { description: 'Nueva descripción.' });

    expect(updated).toMatchObject({ name: 'Agenda y citas', description: 'Nueva descripción.', sortOrder: 20 });
  });

  it('rejects a name already used by another module', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, name: 'Uno' }), catalogModule({ id: 2, name: 'Dos' })],
    });

    expect(() => model.updateModule(2, { name: 'uno' })).toThrowError(
      expect.objectContaining({ code: 'module_name_already_exists' }),
    );
  });

  it('lets a module keep its own name', () => {
    const model = createModulesCatalogModel({ modules: [catalogModule({ id: 1, name: 'Uno' })] });

    expect(() => model.updateModule(1, { name: 'Uno' })).not.toThrow();
  });
});

describe('blockModule / unblockModule', () => {
  it('rejects a protected module', () => {
    const model = createModulesCatalogModel({ modules: [catalogModule({ id: 1, key: 'users' })] });

    expect(() => model.blockModule(1)).toThrowError(expect.objectContaining({ code: 'module_protected' }));
  });

  it('blocks an active module and rejects blocking it again', () => {
    const model = createModulesCatalogModel({ modules: [catalogModule({ id: 1, key: 'inventory' })] });

    expect(model.blockModule(1).statusId).toBe(2);
    expect(() => model.blockModule(1)).toThrowError(
      expect.objectContaining({ code: 'module_already_blocked' }),
    );
  });

  it('unblocks a blocked module and rejects unblocking it again', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'inventory', statusId: 2 })],
    });

    expect(model.unblockModule(1).statusId).toBe(1);
    expect(() => model.unblockModule(1)).toThrowError(
      expect.objectContaining({ code: 'module_already_active' }),
    );
  });

  it('hides the permissions of a blocked module from the active count', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'inventory' })],
      permissions: [catalogPermission({ id: 1, moduleId: 1 })],
    });

    expect(model.activePermissionsCountOf(1)).toBe(1);
    model.blockModule(1);
    // Blocking does not change the permission's own status (research invariant I12 of mailySoft-usuarios).
    expect(model.findPermission(1)?.statusId).toBe(1);
  });
});

describe('deleteModule', () => {
  it('rejects a protected module', () => {
    const model = createModulesCatalogModel({ modules: [catalogModule({ id: 1, key: 'roles' })] });

    expect(() => model.deleteModule(1)).toThrowError(
      expect.objectContaining({ code: 'module_protected' }),
    );
  });

  it('deletes the module and, in the same operation, its non-deleted permissions', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'inventory' })],
      permissions: [
        catalogPermission({ id: 1, moduleId: 1, name: 'inventory:read' }),
        catalogPermission({ id: 2, moduleId: 1, name: 'inventory:write' }),
      ],
    });

    model.deleteModule(1);

    expect(model.findModule(1)?.statusId).toBe(3);
    expect(model.findPermission(1)?.statusId).toBe(3);
    expect(model.findPermission(2)?.statusId).toBe(3);
  });

  it('frees the key and the names of its permissions for reuse', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'inventory' })],
      permissions: [catalogPermission({ id: 1, moduleId: 1, name: 'inventory:read' })],
    });

    model.deleteModule(1);

    expect(() => model.createModule({ key: 'inventory', name: 'Inventario de nuevo', type_id: 2 })).not.toThrow();
    expect(() => model.createPermission({ name: 'inventory:read' })).not.toThrow();
  });
});

describe('listModules', () => {
  it('shows only Active modules by default, sorted by sortOrder then name', () => {
    const model = createModulesCatalogModel({
      modules: [
        catalogModule({ id: 1, key: 'b', name: 'B', sortOrder: 20 }),
        catalogModule({ id: 2, key: 'a', name: 'A', sortOrder: 10 }),
        catalogModule({ id: 3, key: 'c', name: 'C', statusId: 2, sortOrder: 5 }),
      ],
    });

    expect(model.listModules().map((module) => module.key)).toEqual(['a', 'b']);
  });

  it('with status_id=2 shows only the Blocked ones', () => {
    const model = createModulesCatalogModel({
      modules: [
        catalogModule({ id: 1, key: 'a', statusId: 1 }),
        catalogModule({ id: 2, key: 'b', statusId: 2 }),
      ],
    });

    expect(model.listModules({ statusId: 2 }).map((module) => module.key)).toEqual(['b']);
  });

  it('filters by type_id when given', () => {
    const model = createModulesCatalogModel({
      modules: [
        catalogModule({ id: 1, key: 'a', typeId: 1 }),
        catalogModule({ id: 2, key: 'b', typeId: 2 }),
      ],
    });

    expect(model.listModules({ typeId: 2 }).map((module) => module.key)).toEqual(['b']);
  });
});

describe('createPermission', () => {
  it('resolves the module and the action from the name', () => {
    const model = createModulesCatalogModel({
      modules: [catalogModule({ id: 1, key: 'inventory' })],
    });

    const created = model.createPermission({ name: 'inventory:write' });

    expect(created.moduleId).toBe(1);
    expect(created.actionId).toBe(2);
  });

  it('leaves moduleId null when the resource does not match any Active module', () => {
    const model = createModulesCatalogModel();

    const created = model.createPermission({ name: 'ghost:read' });

    expect(created.moduleId).toBeNull();
    expect(created.actionId).toBe(1);
  });

  it('rejects a name already used by a non-deleted permission', () => {
    const model = createModulesCatalogModel({
      permissions: [catalogPermission({ id: 1, name: 'inventory:read' })],
    });

    expect(() => model.createPermission({ name: 'inventory:read' })).toThrowError(
      expect.objectContaining({ code: 'permission_name_already_exists' }),
    );
  });

  it('rejects a name with an invalid format', () => {
    const model = createModulesCatalogModel();

    expect(() => model.createPermission({ name: 'Inventory:Read' })).toThrowError(
      expect.objectContaining({ code: 'validation_error' }),
    );
  });
});

describe('deletePermission', () => {
  it('rejects a permission that no longer exists', () => {
    const model = createModulesCatalogModel();

    expect(() => model.deletePermission(99)).toThrowError(
      expect.objectContaining({ code: 'permission_not_found' }),
    );
  });

  it('deletes it and frees its name', () => {
    const model = createModulesCatalogModel({
      permissions: [catalogPermission({ id: 1, name: 'inventory:read' })],
    });

    model.deletePermission(1);

    expect(model.findPermission(1)?.statusId).toBe(3);
    expect(() => model.createPermission({ name: 'inventory:read' })).not.toThrow();
  });
});

describe('ModuleCatalogError', () => {
  it('carries the HTTP status, the code and the field errors', () => {
    const error = new ModuleCatalogError(422, 'validation_error', 'x', [
      { field: 'name', message: 'y' },
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual([{ field: 'name', message: 'y' }]);
  });
});
