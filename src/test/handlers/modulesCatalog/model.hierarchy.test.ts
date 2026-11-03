import { describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogModel } from './model';
import { moduleChangesFromBody, moduleInputFromBody } from './validation';

const CLINIC = 2;
const SYSTEM = 1;

const patients = catalogModule({ id: 6, key: 'patients', name: 'Pacientes', typeId: CLINIC });

describe('createModule with a parent (spec 024, contract 5.4.0)', () => {
  it('creates the module as a submodule of the parent, with its parent in the answer', () => {
    const model = createModulesCatalogModel({ modules: [patients] });

    const created = model.createModule({
      key: 'prescriptions',
      name: 'Recetas',
      type_id: CLINIC,
      parent_module_id: 6,
    });

    expect(created.parentModuleId).toBe(6);
    expect(model.toModuleDto(created).parent_module).toEqual({
      id: 6,
      key: 'patients',
      name: 'Pacientes',
    });
  });

  it('creates a top-level module without a parent, or with null', () => {
    const model = createModulesCatalogModel({ modules: [patients] });

    expect(
      model.createModule({ key: 'a', name: 'A', type_id: CLINIC, parent_module_id: null })
        .parentModuleId,
    ).toBeNull();
    expect(model.createModule({ key: 'b', name: 'B', type_id: CLINIC }).parentModuleId).toBeNull();
  });

  it('accepts a Blocked parent', () => {
    const model = createModulesCatalogModel({ modules: [{ ...patients, statusId: 2 }] });

    expect(
      model.createModule({ key: 'x', name: 'X', type_id: CLINIC, parent_module_id: 6 })
        .parentModuleId,
    ).toBe(6);
  });

  it.each([
    ['does not exist', [patients], 99, 'module_parent_not_found', 404],
    ['is deleted', [{ ...patients, statusId: 3 }], 6, 'module_parent_not_found', 404],
    [
      'is a submodule',
      [patients, catalogModule({ id: 7, key: 'sub', parentModuleId: 6 })],
      7,
      'module_parent_is_submodule',
      409,
    ],
    [
      'has another type',
      [catalogModule({ id: 8, key: 'reports', typeId: SYSTEM })],
      8,
      'module_parent_type_mismatch',
      409,
    ],
    [
      'is a base module',
      [catalogModule({ id: 9, key: 'users', typeId: SYSTEM })],
      9,
      'module_protected',
      409,
    ],
  ])('refuses a parent that %s', (_case, modules, parentId, code, status) => {
    const model = createModulesCatalogModel({ modules });

    expect(() =>
      model.createModule({
        key: 'new_one',
        name: 'Nuevo',
        type_id: CLINIC,
        parent_module_id: parentId,
      }),
    ).toThrow(expect.objectContaining({ code, status }));
  });

  it('checks the parent before the conflict of key or name', () => {
    const model = createModulesCatalogModel({
      modules: [patients, catalogModule({ id: 2, key: 'taken', name: 'Tomado' })],
    });

    expect(() =>
      model.createModule({ key: 'taken', name: 'Otro', type_id: CLINIC, parent_module_id: 99 }),
    ).toThrow(expect.objectContaining({ code: 'module_parent_not_found' }));
  });

  it('does not create anything when it is refused', () => {
    const model = createModulesCatalogModel({ modules: [patients] });

    expect(() =>
      model.createModule({ key: 'x', name: 'X', type_id: CLINIC, parent_module_id: 99 }),
    ).toThrow();
    expect(model.listModules({ statusId: 1 })).toHaveLength(1);
  });
});

describe('updateModule with a parent (spec 024, contract 5.4.0)', () => {
  const inventory = catalogModule({ id: 2, key: 'inventory', name: 'Inventario' });

  it('assigns a parent to a top-level module, which becomes a submodule', () => {
    const model = createModulesCatalogModel({ modules: [patients, inventory] });

    expect(model.updateModule(2, { parent_module_id: 6 }).parentModuleId).toBe(6);
  });

  it('changes the parent, and removes it with null', () => {
    const other = catalogModule({ id: 3, key: 'agenda', name: 'Agenda' });
    const child = catalogModule({ id: 7, key: 'sub', name: 'Sub', parentModuleId: 6 });
    const model = createModulesCatalogModel({ modules: [patients, other, child] });

    expect(model.updateModule(7, { parent_module_id: 3 }).parentModuleId).toBe(3);
    expect(model.updateModule(7, { parent_module_id: null }).parentModuleId).toBeNull();
  });

  it('leaves the parent as it is when parent_module_id is not sent', () => {
    const child = catalogModule({ id: 7, key: 'sub', name: 'Sub', parentModuleId: 6 });
    const model = createModulesCatalogModel({ modules: [patients, child] });

    expect(model.updateModule(7, { name: 'Nuevo nombre' }).parentModuleId).toBe(6);
  });

  it.each([
    ['is the module itself', 2, 'module_parent_self_reference'],
    ['does not exist', 99, 'module_parent_not_found'],
  ])('refuses a parent that %s', (_case, parentId, code) => {
    const model = createModulesCatalogModel({ modules: [patients, inventory] });

    expect(() => model.updateModule(2, { parent_module_id: parentId })).toThrow(
      expect.objectContaining({ code }),
    );
  });

  it('refuses a submodule as parent, and a parent of another type', () => {
    const child = catalogModule({ id: 7, key: 'sub', name: 'Sub', parentModuleId: 6 });
    const reports = catalogModule({ id: 8, key: 'reports', name: 'Reportes', typeId: SYSTEM });
    const model = createModulesCatalogModel({ modules: [patients, inventory, child, reports] });

    expect(() => model.updateModule(2, { parent_module_id: 7 })).toThrow(
      expect.objectContaining({ code: 'module_parent_is_submodule' }),
    );
    expect(() => model.updateModule(2, { parent_module_id: 8 })).toThrow(
      expect.objectContaining({ code: 'module_parent_type_mismatch' }),
    );
  });

  it('refuses a base module that would become a submodule, and a base module as parent', () => {
    const users = catalogModule({ id: 9, key: 'users', name: 'Usuarios', typeId: SYSTEM });
    const reports = catalogModule({ id: 8, key: 'reports', name: 'Reportes', typeId: SYSTEM });
    const model = createModulesCatalogModel({ modules: [users, reports] });

    expect(() => model.updateModule(9, { parent_module_id: 8 })).toThrow(
      expect.objectContaining({ code: 'module_protected' }),
    );
    expect(() => model.updateModule(8, { parent_module_id: 9 })).toThrow(
      expect.objectContaining({ code: 'module_protected' }),
    );
  });

  it('refuses to make a submodule out of a module that has submodules', () => {
    const child = catalogModule({ id: 7, key: 'sub', name: 'Sub', parentModuleId: 6 });
    const other = catalogModule({ id: 3, key: 'agenda', name: 'Agenda' });
    const model = createModulesCatalogModel({ modules: [patients, child, other] });

    expect(() => model.updateModule(6, { parent_module_id: 3 })).toThrow(
      expect.objectContaining({ code: 'module_has_submodules', status: 409 }),
    );
  });

  it('counts a Blocked submodule as a submodule, and not a deleted one', () => {
    const other = catalogModule({ id: 3, key: 'agenda', name: 'Agenda' });
    const blockedChild = catalogModule({ id: 7, key: 'sub', parentModuleId: 6, statusId: 2 });
    const withBlocked = createModulesCatalogModel({ modules: [patients, blockedChild, other] });
    const deletedChild = { ...blockedChild, statusId: 3 };
    const withDeleted = createModulesCatalogModel({ modules: [patients, deletedChild, other] });

    expect(() => withBlocked.updateModule(6, { parent_module_id: 3 })).toThrow(
      expect.objectContaining({ code: 'module_has_submodules' }),
    );
    expect(withDeleted.updateModule(6, { parent_module_id: 3 }).parentModuleId).toBe(3);
  });

  it('removing the parent only needs the module to exist', () => {
    const child = catalogModule({ id: 7, key: 'sub', name: 'Sub', parentModuleId: 99 });
    const model = createModulesCatalogModel({ modules: [child] });

    expect(model.updateModule(7, { parent_module_id: null }).parentModuleId).toBeNull();
  });

  it('refuses the module before the parent when the module does not exist', () => {
    const model = createModulesCatalogModel({ modules: [patients] });

    expect(() => model.updateModule(99, { parent_module_id: 99 })).toThrow(
      expect.objectContaining({ code: 'module_not_found' }),
    );
  });

  it('changes nothing when the parent is refused, not even the other fields sent with it', () => {
    const model = createModulesCatalogModel({ modules: [patients, inventory] });

    expect(() => model.updateModule(2, { name: 'Otro nombre', parent_module_id: 99 })).toThrow();
    expect(model.findModule(2)?.name).toBe('Inventario');
  });
});

describe('the body of the simulator, parent_module_id (spec 024)', () => {
  it('reads parent_module_id in a creation and in a modification, null included', () => {
    expect(
      moduleInputFromBody({ key: 'k', name: 'N', type_id: 2, parent_module_id: 6 }),
    ).toMatchObject({ parent_module_id: 6 });
    expect(moduleChangesFromBody({ parent_module_id: null })).toEqual({ parent_module_id: null });
    expect(moduleChangesFromBody({ name: 'N' })).not.toHaveProperty('parent_module_id');
  });

  it.each([0, -1, 1.5, '6', true])('answers 422 on parent_module_id for %j', (value) => {
    expect(() => moduleChangesFromBody({ parent_module_id: value })).toThrow(
      expect.objectContaining({
        status: 422,
        fieldErrors: [expect.objectContaining({ field: 'parent_module_id' })],
      }),
    );
  });

  it('does not take the response field parent_module in a request', () => {
    expect(() => moduleChangesFromBody({ parent_module: { id: 6 } })).toThrow(
      expect.objectContaining({ status: 422 }),
    );
  });
});
