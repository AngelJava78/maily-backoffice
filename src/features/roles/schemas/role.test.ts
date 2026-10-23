import { describe, expect, it } from 'vitest';

import { roleCreateInputSchema, roleSchema, rolesSchema } from './role';

const VALID_DTO = {
  id: 6,
  name: 'Doctor',
  description: 'Atiende pacientes.',
  created_at: '2026-10-15T05:57:30.521Z',
  status: { id: 1, name: 'Activo' },
  type: { id: 2, name: 'Clínica' },
};

describe('roleSchema', () => {
  it('converts the DTO into the domain model', () => {
    expect(roleSchema.parse(VALID_DTO)).toEqual({
      id: 6,
      name: 'Doctor',
      description: 'Atiende pacientes.',
      createdAt: '2026-10-15T05:57:30.521Z',
      status: { id: 1, name: 'Activo' },
      type: { id: 2, name: 'Clínica' },
    });
  });

  it('accepts a null description', () => {
    expect(roleSchema.parse({ ...VALID_DTO, description: null }).description).toBeNull();
  });

  it.each([1, 2])('accepts type.id %i', (id) => {
    expect(roleSchema.parse({ ...VALID_DTO, type: { id, name: 'X' } }).type.id).toBe(id);
  });

  it('rejects a type.id other than 1 or 2', () => {
    expect(() => roleSchema.parse({ ...VALID_DTO, type: { id: 3, name: 'X' } })).toThrow();
  });

  it('rejects a name longer than 50 characters', () => {
    expect(() => roleSchema.parse({ ...VALID_DTO, name: 'X'.repeat(51) })).toThrow();
  });
});

describe('rolesSchema', () => {
  it('parses a list of roles', () => {
    expect(rolesSchema.parse([VALID_DTO])).toHaveLength(1);
  });
});

describe('roleCreateInputSchema', () => {
  it('trims the name and requires it, from 1 to 50 characters', () => {
    const input = roleCreateInputSchema.parse({ name: '  Auditor  ', description: null, typeId: 1 });
    expect(input.name).toBe('Auditor');
  });

  it.each(['', '   ', 'X'.repeat(51)])('rejects an invalid name %j', (name) => {
    expect(() => roleCreateInputSchema.parse({ name, description: null, typeId: 1 })).toThrow();
  });

  it('accepts a null or omitted description', () => {
    expect(roleCreateInputSchema.parse({ name: 'Auditor', typeId: 1 }).description).toBeNull();
    expect(
      roleCreateInputSchema.parse({ name: 'Auditor', description: null, typeId: 1 }).description,
    ).toBeNull();
  });

  it.each([0, 3, 1.5])('rejects a typeId other than 1 or 2 (%j)', (typeId) => {
    expect(() => roleCreateInputSchema.parse({ name: 'Auditor', typeId })).toThrow();
  });
});
