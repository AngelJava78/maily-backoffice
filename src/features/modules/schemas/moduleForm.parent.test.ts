import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from './moduleActionCatalog';
import {
  initialModuleFormValues,
  moduleFormSchema,
  toCreateModuleBody,
  toFormValues,
  toUpdateModuleBody,
} from './moduleForm';
import type { SystemModule } from './systemModule';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 7,
    key: 'prescriptions',
    name: 'Recetas',
    description: null,
    sortOrder: 30,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    parentModule: null,
    actions: new Set(['read']),
    permissionIdByAction: new Map([['read', 1]]),
    ...overrides,
  };
}

const PATIENTS = { id: 6, key: 'patients', name: 'Pacientes' };

describe('the parent module in the form (spec 024)', () => {
  it('starts with no parent', () => {
    expect(initialModuleFormValues.parentModuleId).toBe('');
  });

  it('accepts any text as the parent: the form only offers valid ones and the service decides', () => {
    expect(
      moduleFormSchema.safeParse({ ...initialModuleFormValues, name: 'N', key: 'k' }).success,
    ).toBe(true);
    expect(
      moduleFormSchema.safeParse({
        ...initialModuleFormValues,
        name: 'N',
        key: 'k',
        parentModuleId: '6',
      }).success,
    ).toBe(true);
  });

  describe('toFormValues', () => {
    it('gives an empty parent for a top-level module', () => {
      expect(toFormValues(module()).parentModuleId).toBe('');
    });

    it('gives the id of the parent, as text, for a submodule', () => {
      expect(toFormValues(module({ parentModule: PATIENTS })).parentModuleId).toBe('6');
    });
  });

  describe('toCreateModuleBody', () => {
    const values = { ...initialModuleFormValues, key: 'prescriptions', name: 'Recetas' };

    it('does not send parent_module_id without a parent', () => {
      expect(toCreateModuleBody(values)).not.toHaveProperty('parent_module_id');
    });

    it('sends the parent as a number when there is one', () => {
      expect(toCreateModuleBody({ ...values, parentModuleId: '6' })).toMatchObject({
        parent_module_id: 6,
      });
    });
  });

  describe('toUpdateModuleBody', () => {
    it('gives null when nothing changed, the parent included', () => {
      const initial = module({ parentModule: PATIENTS });

      expect(toUpdateModuleBody(initial, toFormValues(initial))).toBeNull();
    });

    it('sends the new parent, as a number, when it is assigned to a top-level module', () => {
      const initial = module();

      expect(
        toUpdateModuleBody(initial, { ...toFormValues(initial), parentModuleId: '6' }),
      ).toEqual({
        parent_module_id: 6,
      });
    });

    it('sends the other parent when it is changed', () => {
      const initial = module({ parentModule: PATIENTS });

      expect(
        toUpdateModuleBody(initial, { ...toFormValues(initial), parentModuleId: '2' }),
      ).toEqual({
        parent_module_id: 2,
      });
    });

    it('sends null to remove the parent', () => {
      const initial = module({ parentModule: PATIENTS });

      expect(toUpdateModuleBody(initial, { ...toFormValues(initial), parentModuleId: '' })).toEqual(
        {
          parent_module_id: null,
        },
      );
    });

    it('counts a change of the parent alone as a change, and sends the other fields with it', () => {
      const initial = module();

      expect(
        toUpdateModuleBody(initial, {
          ...toFormValues(initial),
          name: 'Recetas médicas',
          parentModuleId: '6',
        }),
      ).toEqual({ name: 'Recetas médicas', parent_module_id: 6 });
    });

    it('never sends key nor type_id', () => {
      const initial = module();
      const body = toUpdateModuleBody(initial, { ...toFormValues(initial), parentModuleId: '6' });

      expect(body).not.toHaveProperty('key');
      expect(body).not.toHaveProperty('type_id');
    });
  });
});
