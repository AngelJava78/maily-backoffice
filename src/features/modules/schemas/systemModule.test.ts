import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { isProtectedModule, PROTECTED_MODULE_KEYS, systemModuleSchema } from './systemModule';

function dto(overrides: Partial<z.input<typeof systemModuleSchema>> = {}) {
  return {
    id: 5,
    key: 'inventory',
    name: 'Inventario',
    description: null,
    sort_order: 160,
    created_at: '2026-10-22T00:00:00Z',
    status: { id: 1, name: 'Activo' },
    type: { id: 2, name: 'Clínica' },
    active_permissions_count: 0,
    parent_module: null,
    ...overrides,
  };
}

describe('systemModuleSchema', () => {
  it('converts the DTO (snake_case) into the domain model (camelCase)', () => {
    expect(systemModuleSchema.parse(dto())).toEqual({
      id: 5,
      key: 'inventory',
      name: 'Inventario',
      description: null,
      sortOrder: 160,
      createdAt: '2026-10-22T00:00:00Z',
      statusId: 1,
      typeId: 2,
      activePermissionsCount: 0,
      parentModule: null,
    });
  });

  it('accepts a description', () => {
    expect(
      systemModuleSchema.parse(dto({ description: 'Medicamentos y material.' })).description,
    ).toBe('Medicamentos y material.');
  });

  it.each(['Inventory', '1nventory', 'in ventory', 'a'.repeat(51)])(
    'rejects a key that does not match ^[a-z][a-z0-9_]*$ or exceeds 50 characters: %s',
    (key) => {
      expect(() => systemModuleSchema.parse(dto({ key }))).toThrow();
    },
  );

  it('rejects a name longer than 100 characters', () => {
    expect(() => systemModuleSchema.parse(dto({ name: 'a'.repeat(101) }))).toThrow();
  });

  it('rejects a description longer than 500 characters', () => {
    expect(() => systemModuleSchema.parse(dto({ description: 'a'.repeat(501) }))).toThrow();
  });
});

describe('systemModuleSchema, the parent module (spec 024)', () => {
  it('reads a top-level module as one without a parent', () => {
    expect(systemModuleSchema.parse(dto({ parent_module: null })).parentModule).toBeNull();
  });

  it('reads the parent of a submodule as id, key and name', () => {
    const parsed = systemModuleSchema.parse(
      dto({ parent_module: { id: 6, key: 'patients', name: 'Pacientes' } }),
    );

    expect(parsed.parentModule).toEqual({ id: 6, key: 'patients', name: 'Pacientes' });
  });

  it('rejects an answer that has no parent_module at all: the field is required', () => {
    const withoutParent: Record<string, unknown> = { ...dto() };
    delete withoutParent.parent_module;

    expect(() => systemModuleSchema.parse(withoutParent)).toThrow();
  });

  it.each([0, -1, 1.5, '6'])(
    'rejects a parent whose id is not a positive whole number: %s',
    (id) => {
      expect(() =>
        systemModuleSchema.parse({ ...dto(), parent_module: { id, key: 'p', name: 'P' } }),
      ).toThrow();
    },
  );

  it.each([
    { id: 6, name: 'Pacientes' },
    { id: 6, key: 'patients' },
  ])('rejects a parent without its key or its name: %j', (parent) => {
    expect(() => systemModuleSchema.parse({ ...dto(), parent_module: parent })).toThrow();
  });
});

describe('PROTECTED_MODULE_KEYS / isProtectedModule', () => {
  it('fixes the four protected keys', () => {
    expect(PROTECTED_MODULE_KEYS).toEqual(['users', 'roles', 'permissions', 'modules']);
  });

  it('recognizes a protected module', () => {
    expect(isProtectedModule('users')).toBe(true);
  });

  it('does not treat any other module as protected', () => {
    expect(isProtectedModule('inventory')).toBe(false);
  });
});
