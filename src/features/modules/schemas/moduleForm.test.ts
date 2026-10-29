import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from './moduleActionCatalog';
import {
  getChangedActions,
  initialModuleFormValues,
  moduleFormSchema,
  toCreateModuleBody,
  toFormValues,
  toUpdateModuleBody,
} from './moduleForm';
import type { SystemModule } from './systemModule';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 5,
    key: 'appointments',
    name: 'Agenda y citas',
    description: 'Calendario por doctor y consultorio.',
    sortOrder: 20,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 4,
    actions: new Set(['read', 'write', 'update', 'delete']),
    permissionIdByAction: new Map([
      ['read', 1],
      ['write', 2],
      ['update', 3],
      ['delete', 4],
    ]),
    ...overrides,
  };
}

describe('initialModuleFormValues', () => {
  it('starts with the four actions marked (FR-012)', () => {
    expect([...initialModuleFormValues.actions]).toEqual(['read', 'write', 'update', 'delete']);
    expect(initialModuleFormValues.type).toBe(MODULE_TYPE.CLINIC);
    expect(initialModuleFormValues.key).toBe('');
    expect(initialModuleFormValues.sortOrder).toBe('');
  });
});

describe('moduleFormSchema', () => {
  const valid = {
    type: MODULE_TYPE.CLINIC,
    key: 'inventory',
    name: 'Inventario',
    description: '',
    sortOrder: '',
    actions: new Set(['read'] as const),
  };

  it('accepts a valid value', () => {
    expect(moduleFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['Inventory', '1nventory', ''])('rejects an invalid key: %s', (key) => {
    expect(moduleFormSchema.safeParse({ ...valid, key }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(moduleFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    expect(moduleFormSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects a description longer than 500 characters', () => {
    expect(moduleFormSchema.safeParse({ ...valid, description: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });

  it.each(['abc', '-1', '1.5'])('rejects a sortOrder that is not digits only: %s', (sortOrder) => {
    expect(moduleFormSchema.safeParse({ ...valid, sortOrder }).success).toBe(false);
  });

  it('accepts an empty sortOrder', () => {
    expect(moduleFormSchema.safeParse({ ...valid, sortOrder: '' }).success).toBe(true);
  });

  it('accepts an empty set of actions (022, FR-016: a module can be saved with none marked)', () => {
    expect(moduleFormSchema.safeParse({ ...valid, actions: new Set() }).success).toBe(true);
  });

  it('accepts "read" alone, with none of write/update/delete', () => {
    expect(moduleFormSchema.safeParse({ ...valid, actions: new Set(['read']) }).success).toBe(true);
  });

  it.each(['write', 'update', 'delete'] as const)(
    'rejects "%s" without "read" (022, FR-015)',
    (action) => {
      const result = moduleFormSchema.safeParse({ ...valid, actions: new Set([action]) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Para usar Crear, Modificar o Eliminar, marca también Ver.',
        );
      }
    },
  );

  it('accepts all four actions together', () => {
    expect(
      moduleFormSchema.safeParse({
        ...valid,
        actions: new Set(['read', 'write', 'update', 'delete']),
      }).success,
    ).toBe(true);
  });
});

describe('toCreateModuleBody', () => {
  it('gives the DTO with type_id and no sort_order when it was left empty', () => {
    expect(
      toCreateModuleBody({
        type: MODULE_TYPE.CLINIC,
        key: 'inventory',
        name: 'Inventario',
        description: '',
        sortOrder: '',
        actions: new Set(['read']),
      }),
    ).toEqual({ key: 'inventory', name: 'Inventario', type_id: MODULE_TYPE.CLINIC });
  });

  it('includes description and sort_order when present', () => {
    expect(
      toCreateModuleBody({
        type: MODULE_TYPE.SYSTEM,
        key: 'audit',
        name: 'Auditoría',
        description: 'Registro de auditoría.',
        sortOrder: '90',
        actions: new Set(['read']),
      }),
    ).toEqual({
      key: 'audit',
      name: 'Auditoría',
      type_id: MODULE_TYPE.SYSTEM,
      description: 'Registro de auditoría.',
      sort_order: 90,
    });
  });
});

describe('toFormValues', () => {
  it('fills the form from an existing module, including its fixed type and key', () => {
    const values = toFormValues(module());
    expect(values.type).toBe(MODULE_TYPE.CLINIC);
    expect(values.key).toBe('appointments');
    expect(values.name).toBe('Agenda y citas');
    expect(values.description).toBe('Calendario por doctor y consultorio.');
    expect(values.sortOrder).toBe('20');
    expect([...values.actions]).toEqual(['read', 'write', 'update', 'delete']);
  });
});

describe('toUpdateModuleBody', () => {
  it('gives null when nothing changed', () => {
    const initial = module();
    expect(toUpdateModuleBody(initial, toFormValues(initial))).toBeNull();
  });

  it('gives only the changed fields', () => {
    const initial = module();
    const values = { ...toFormValues(initial), description: 'Nueva descripción.' };
    expect(toUpdateModuleBody(initial, values)).toEqual({ description: 'Nueva descripción.' });
  });

  it('never includes key or type_id, even though the form carries them', () => {
    const initial = module();
    const values = {
      ...toFormValues(initial),
      name: 'Agenda',
      key: 'changed',
      type: MODULE_TYPE.SYSTEM,
    };
    const body = toUpdateModuleBody(initial, values);
    expect(body).not.toHaveProperty('key');
    expect(body).not.toHaveProperty('type_id');
    expect(body).toEqual({ name: 'Agenda' });
  });
});

describe('getChangedActions', () => {
  it('gives what to add and what to remove', () => {
    const initial = new Set(['read', 'write'] as const);
    const next = new Set(['read', 'update'] as const);
    expect(getChangedActions(initial, next)).toEqual({ toAdd: ['update'], toRemove: ['write'] });
  });

  it('gives empty arrays when nothing changed', () => {
    const same = new Set(['read'] as const);
    expect(getChangedActions(same, new Set(same))).toEqual({ toAdd: [], toRemove: [] });
  });
});
