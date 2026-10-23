import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from './moduleActionCatalog';
import {
  createModuleFormSchema,
  getChangedActions,
  initialCreateModuleFormValues,
  toCreateModuleBody,
  toFormValues,
  toUpdateModuleBody,
  updateModuleFormSchema,
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

describe('initialCreateModuleFormValues', () => {
  it('starts with the four actions marked (FR-012)', () => {
    expect([...initialCreateModuleFormValues.actions]).toEqual(['read', 'write', 'update', 'delete']);
    expect(initialCreateModuleFormValues.type).toBe(MODULE_TYPE.CLINIC);
    expect(initialCreateModuleFormValues.key).toBe('');
    expect(initialCreateModuleFormValues.sortOrder).toBe('');
  });
});

describe('createModuleFormSchema', () => {
  const valid = {
    type: MODULE_TYPE.CLINIC,
    key: 'inventory',
    name: 'Inventario',
    description: '',
    sortOrder: '',
    actions: new Set(['read'] as const),
  };

  it('accepts a valid value', () => {
    expect(createModuleFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['Inventory', '1nventory', ''])('rejects an invalid key: %s', (key) => {
    expect(createModuleFormSchema.safeParse({ ...valid, key }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(createModuleFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    expect(createModuleFormSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects a description longer than 500 characters', () => {
    expect(createModuleFormSchema.safeParse({ ...valid, description: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });

  it.each(['abc', '-1', '1.5'])('rejects a sortOrder that is not digits only: %s', (sortOrder) => {
    expect(createModuleFormSchema.safeParse({ ...valid, sortOrder }).success).toBe(false);
  });

  it('accepts an empty sortOrder', () => {
    expect(createModuleFormSchema.safeParse({ ...valid, sortOrder: '' }).success).toBe(true);
  });
});

describe('updateModuleFormSchema', () => {
  it('does not require type or key', () => {
    const result = updateModuleFormSchema.safeParse({
      name: 'Agenda y citas',
      description: '',
      sortOrder: '20',
      actions: new Set(['read'] as const),
    });
    expect(result.success).toBe(true);
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
  it('fills the form from an existing module', () => {
    const values = toFormValues(module());
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

  it('never includes key or type_id', () => {
    const initial = module();
    const values = { ...toFormValues(initial), name: 'Agenda' };
    const body = toUpdateModuleBody(initial, values);
    expect(body).not.toHaveProperty('key');
    expect(body).not.toHaveProperty('type_id');
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
