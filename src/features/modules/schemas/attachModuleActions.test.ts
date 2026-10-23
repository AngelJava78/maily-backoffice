import { describe, expect, it } from 'vitest';

import { attachModuleActions } from './attachModuleActions';
import type { SystemModuleBase } from './systemModule';

function module(overrides: Partial<SystemModuleBase> = {}): SystemModuleBase {
  return {
    id: 1,
    key: 'appointments',
    name: 'Agenda y citas',
    description: null,
    sortOrder: 20,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: 2,
    activePermissionsCount: 2,
    ...overrides,
  };
}

interface RawPermission {
  readonly id: number;
  readonly module: { readonly key: string } | null;
  readonly action: { readonly key: string } | null;
}

function permission(overrides: Partial<RawPermission> = {}): RawPermission {
  return {
    id: 100,
    module: { key: 'appointments' },
    action: { key: 'read' },
    ...overrides,
  };
}

describe('attachModuleActions', () => {
  it('attaches the matching actions and their permission id to each module, in the fixed order (Ver, Crear, Modificar, Eliminar) regardless of the order the API returned them', () => {
    const [result] = attachModuleActions(
      [module()],
      [
        permission({ id: 2, action: { key: 'write' } }),
        permission({ id: 1, action: { key: 'read' } }),
      ],
    );

    expect(result).toBeDefined();
    expect([...(result?.actions ?? [])]).toEqual(['read', 'write']);
    expect(result?.permissionIdByAction.get('read')).toBe(1);
    expect(result?.permissionIdByAction.get('write')).toBe(2);
  });

  it('ignores a permission of a module not in the list', () => {
    const [result] = attachModuleActions([module()], [permission({ module: { key: 'other' } })]);

    expect(result?.actions.size).toBe(0);
  });

  it('ignores a legacy permission without a module or an action', () => {
    const [result] = attachModuleActions([module()], [permission({ module: null, action: null })]);

    expect(result?.actions.size).toBe(0);
  });

  it('gives an empty set to a module with no matching permission', () => {
    const [result] = attachModuleActions([module()], []);

    expect(result?.actions.size).toBe(0);
    expect(result?.permissionIdByAction.size).toBe(0);
  });

  it('does not mutate the arrays it receives', () => {
    const modules = [module()];
    const permissions = [permission()];

    attachModuleActions(modules, permissions);

    expect(modules).toHaveLength(1);
    expect(permissions).toHaveLength(1);
  });
});
