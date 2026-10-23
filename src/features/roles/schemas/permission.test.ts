import { describe, expect, it } from 'vitest';

import { permissionSchema, permissionsSchema } from './permission';

const VALID_DTO = {
  id: 25,
  name: 'patients:read',
  description: null,
  created_at: '2026-10-15T05:57:30.521Z',
  status: { id: 1, name: 'Activo' },
  module: { id: 5, key: 'patients', name: 'Pacientes', type: { id: 2, name: 'Clínica' } },
  action: { id: 1, key: 'read', name: 'Ver' },
};

describe('permissionSchema', () => {
  it('converts the DTO into the domain model', () => {
    expect(permissionSchema.parse(VALID_DTO)).toEqual({
      id: 25,
      name: 'patients:read',
      module: { id: 5, key: 'patients', name: 'Pacientes', type: { id: 2, name: 'Clínica' } },
      action: { id: 1, key: 'read', name: 'Ver' },
    });
  });

  it('accepts a null module and a null action', () => {
    const permission = permissionSchema.parse({ ...VALID_DTO, module: null, action: null });
    expect(permission.module).toBeNull();
    expect(permission.action).toBeNull();
  });

  it.each(['read', 'write', 'update', 'delete'])('accepts the action key %s', (key) => {
    expect(
      permissionSchema.parse({ ...VALID_DTO, action: { id: 1, key, name: 'X' } }).action?.key,
    ).toBe(key);
  });

  it('passes through an action key that is not one of the four known ones (hand-managed catalog)', () => {
    // permissionMatrix.ts, not this schema, decides to paint no column for an unknown key: parsing
    // must not fail just because the backend's actions catalog grew a fifth action by hand.
    const permission = permissionSchema.parse({
      ...VALID_DTO,
      action: { id: 9, key: 'export', name: 'Exportar' },
    });
    expect(permission.action).toEqual({ id: 9, key: 'export', name: 'Exportar' });
  });
});

describe('permissionsSchema', () => {
  it('parses a list of permissions', () => {
    expect(permissionsSchema.parse([VALID_DTO])).toHaveLength(1);
  });
});
