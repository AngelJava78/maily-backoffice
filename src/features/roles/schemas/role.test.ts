import { describe, expect, it } from 'vitest';

import {
  nameChangesOf,
  nextDuplicateName,
  roleCreateInputSchema,
  roleEditInputSchema,
  roleSchema,
  rolesSchema,
} from './role';

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
    const input = roleCreateInputSchema.parse({
      name: '  Auditor  ',
      description: null,
      typeId: 1,
    });
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

describe('roleEditInputSchema', () => {
  it('trims the name and requires it, from 1 to 50 characters', () => {
    const input = roleEditInputSchema.parse({ name: '  Auditor  ', description: '' });
    expect(input.name).toBe('Auditor');
  });

  it.each(['', '   ', 'X'.repeat(51)])('rejects an invalid name %j', (name) => {
    expect(() => roleEditInputSchema.parse({ name, description: '' })).toThrow();
  });

  it('accepts an empty description', () => {
    expect(roleEditInputSchema.parse({ name: 'Auditor', description: '' }).description).toBe('');
  });

  it('has no typeId field: a role type never changes from this form', () => {
    expect(
      roleEditInputSchema.safeParse({ name: 'Auditor', description: '', typeId: 1 }).success,
    ).toBe(true);
    expect(
      'typeId' in roleEditInputSchema.parse({ name: 'Auditor', description: '', typeId: 1 }),
    ).toBe(false);
  });
});

describe('nameChangesOf', () => {
  const ROLE = { name: 'Developer', description: null };

  it('is empty when nothing changed', () => {
    expect(nameChangesOf({ name: 'Developer', description: '' }, ROLE)).toEqual({});
  });

  it('includes only the name when just it changed', () => {
    expect(nameChangesOf({ name: 'Developer II', description: '' }, ROLE)).toEqual({
      name: 'Developer II',
    });
  });

  it('turns a blank description into null, matching a role with none', () => {
    expect(nameChangesOf({ name: 'Developer', description: '   ' }, ROLE)).toEqual({});
  });

  it('includes a real, trimmed description', () => {
    expect(nameChangesOf({ name: 'Developer', description: '  Hace guardias.  ' }, ROLE)).toEqual({
      description: 'Hace guardias.',
    });
  });
});

describe('nextDuplicateName', () => {
  it('suggests "X (copia)" when it is free', () => {
    expect(nextDuplicateName('Soporte Nivel 2', new Set())).toBe('Soporte Nivel 2 (copia)');
  });

  it('tries "X (copia 2)", then "X (copia 3)"... until one is free', () => {
    const taken = new Set(['soporte nivel 2 (copia)', 'soporte nivel 2 (copia 2)']);

    expect(nextDuplicateName('Soporte Nivel 2', taken)).toBe('Soporte Nivel 2 (copia 3)');
  });

  it('compares names without distinguishing uppercase/lowercase, like the service', () => {
    const taken = new Set(['owner (copia)']);

    expect(nextDuplicateName('Owner', taken)).toBe('Owner (copia 2)');
  });

  it('keeps the whole name within 50 characters', () => {
    const original = 'X'.repeat(50);

    const name = nextDuplicateName(original, new Set());

    expect(name.length).toBeLessThanOrEqual(50);
    expect(name.endsWith(' (copia)')).toBe(true);
  });
});
