import { describe, expect, it } from 'vitest';

import { moduleSchema, modulesSchema } from './module';

const VALID_DTO = {
  id: 5,
  key: 'patients',
  name: 'Pacientes',
  description: null,
  sort_order: 50,
  created_at: '2026-10-15T05:57:30.521Z',
  status: { id: 1, name: 'Activo' },
  type: { id: 2, name: 'Clínica' },
  active_permissions_count: 4,
};

describe('moduleSchema', () => {
  it('converts the DTO into the domain model', () => {
    expect(moduleSchema.parse(VALID_DTO)).toEqual({
      id: 5,
      key: 'patients',
      name: 'Pacientes',
      sortOrder: 50,
      type: { id: 2, name: 'Clínica' },
    });
  });

  it('rejects a key that is not lowercase letters, digits or underscores starting with a letter', () => {
    expect(() => moduleSchema.parse({ ...VALID_DTO, key: 'Patients' })).toThrow();
    expect(() => moduleSchema.parse({ ...VALID_DTO, key: '1patients' })).toThrow();
  });

  it.each([1, 2])('accepts type.id %i', (id) => {
    expect(moduleSchema.parse({ ...VALID_DTO, type: { id, name: 'X' } }).type.id).toBe(id);
  });
});

describe('modulesSchema', () => {
  it('parses a list of modules', () => {
    expect(modulesSchema.parse([VALID_DTO])).toHaveLength(1);
  });
});
