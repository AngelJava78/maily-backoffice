import { describe, expect, it } from 'vitest';

import { clinicModuleSchema, clinicModulesSchema } from './clinicModule';

const VALID_DTO = {
  id: 7,
  key: 'administrators',
  name: 'Administradores',
  description: 'Personal administrativo de la clínica y su acceso al sistema.',
  sort_order: 70,
  created_at: '2026-10-22T20:11:25.816275Z',
  status: { id: 1, name: 'Activo' },
  type: { id: 2, name: 'Clínica' },
  active_permissions_count: 5,
};

describe('clinicModuleSchema', () => {
  it('converts the DTO into the domain model', () => {
    expect(clinicModuleSchema.parse(VALID_DTO)).toEqual({
      key: 'administrators',
      name: 'Administradores',
      description: 'Personal administrativo de la clínica y su acceso al sistema.',
      sortOrder: 70,
    });
  });

  it('accepts a null description', () => {
    expect(clinicModuleSchema.parse({ ...VALID_DTO, description: null }).description).toBeNull();
  });

  it('drops DTO fields the domain model does not need', () => {
    const parsed = clinicModuleSchema.parse(VALID_DTO);
    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('created_at');
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('type');
    expect(parsed).not.toHaveProperty('active_permissions_count');
  });

  it('rejects a key that is not lowercase letters, digits or underscores starting with a letter', () => {
    expect(() => clinicModuleSchema.parse({ ...VALID_DTO, key: 'Administrators' })).toThrow();
    expect(() => clinicModuleSchema.parse({ ...VALID_DTO, key: '1administrators' })).toThrow();
  });
});

describe('clinicModulesSchema', () => {
  it('parses a list of modules', () => {
    expect(clinicModulesSchema.parse([VALID_DTO])).toHaveLength(1);
  });
});
