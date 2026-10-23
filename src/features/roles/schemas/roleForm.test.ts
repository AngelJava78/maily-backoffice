import { describe, expect, it } from 'vitest';

import { roleFormSchema, toCreateRoleVariables } from './roleForm';

const VALID = {
  name: 'Auditor',
  description: '',
  typeId: 1 as const,
  copyPermissionsFromRoleId: null,
};

describe('roleFormSchema', () => {
  it('accepts a minimal, valid value', () => {
    expect(roleFormSchema.parse(VALID)).toEqual(VALID);
  });

  it.each(['', '   ', 'X'.repeat(51)])('rejects an invalid name %j', (name) => {
    expect(() => roleFormSchema.parse({ ...VALID, name })).toThrow();
  });

  it('rejects typeId null (US2-4: a type must be chosen)', () => {
    expect(() => roleFormSchema.parse({ ...VALID, typeId: null })).toThrow();
  });

  it.each([1, 2] as const)('accepts typeId %i', (typeId) => {
    expect(roleFormSchema.parse({ ...VALID, typeId }).typeId).toBe(typeId);
  });

  it('accepts an empty description and a null copyPermissionsFromRoleId', () => {
    const parsed = roleFormSchema.parse(VALID);
    expect(parsed.description).toBe('');
    expect(parsed.copyPermissionsFromRoleId).toBeNull();
  });
});

describe('toCreateRoleVariables', () => {
  it('turns an empty (or blank) description into null', () => {
    expect(toCreateRoleVariables({ ...VALID, description: '   ' })?.description).toBeNull();
  });

  it('trims a real description', () => {
    expect(
      toCreateRoleVariables({ ...VALID, description: '  Atiende pacientes.  ' })?.description,
    ).toBe('Atiende pacientes.');
  });

  it('omits copyPermissionsFromRoleId when null', () => {
    expect(toCreateRoleVariables(VALID)).not.toHaveProperty('copyPermissionsFromRoleId');
  });

  it('includes copyPermissionsFromRoleId when chosen', () => {
    expect(
      toCreateRoleVariables({ ...VALID, copyPermissionsFromRoleId: 1 })?.copyPermissionsFromRoleId,
    ).toBe(1);
  });

  it('gives null when typeId is not chosen yet (guards a submit that should not happen)', () => {
    expect(toCreateRoleVariables({ ...VALID, typeId: null })).toBeNull();
  });
});
