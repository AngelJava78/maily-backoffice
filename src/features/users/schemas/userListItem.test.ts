import { describe, expect, it } from 'vitest';

import { userDto } from '@/test/factories';

import { platformUserSchema } from './user';
import { describeUserType, userListItemSchema } from './userListItem';

const CLINIC = { id: 2, name: 'Clínica' };
const SYSTEM = { id: 1, name: 'Sistema' };

describe('userListItemSchema', () => {
  it('reads a user of the list as the usual user plus the types of its active roles', () => {
    const dto = { ...userDto(), role_types: [CLINIC] };

    expect(userListItemSchema.parse(dto)).toEqual({
      ...platformUserSchema.parse(userDto()),
      roleTypes: [CLINIC],
    });
  });

  it('accepts a user without active roles, whose list of types is empty', () => {
    expect(userListItemSchema.parse({ ...userDto(), role_types: [] }).roleTypes).toEqual([]);
  });

  it('keeps both types, in the order of the service, for a user that has the two', () => {
    expect(
      userListItemSchema.parse({ ...userDto(), role_types: [SYSTEM, CLINIC] }).roleTypes,
    ).toEqual([SYSTEM, CLINIC]);
  });

  // An API older than 5.5.0 ignores the filters and has no `role_types`: the list must fail
  // instead of showing active users under «Bloqueados» (research D2).
  it('rejects a user without role_types', () => {
    expect(userListItemSchema.safeParse(userDto()).success).toBe(false);
  });

  it.each([
    ['role_types that are not a list', 'Clínica'],
    ['a type with a fractional id', [{ id: 1.5, name: 'Sistema' }]],
    ['a type without id', [{ name: 'Sistema' }]],
    ['a type with an empty name', [{ id: 1, name: '' }]],
    ['a type without name', [{ id: 1 }]],
  ])('rejects %s', (_label, roleTypes) => {
    expect(userListItemSchema.safeParse({ ...userDto(), role_types: roleTypes }).success).toBe(
      false,
    );
  });

  it('still validates the fields of the user', () => {
    expect(
      userListItemSchema.safeParse({ ...userDto({ email: '' }), role_types: [] }).success,
    ).toBe(false);
  });

  it('leaves out the fields it does not use, such as the photo', () => {
    const item = userListItemSchema.parse({
      ...userDto(),
      photo_url: 'https://example.com/a.png',
      role_types: [],
    });

    expect(item).not.toHaveProperty('photo_url');
    expect(item).not.toHaveProperty('role_types');
  });
});

describe('describeUserType', () => {
  it('shows «—» for a user without active roles (FR-006)', () => {
    expect(describeUserType([])).toBe('—');
  });

  it.each([
    [[SYSTEM], 'Sistema'],
    [[CLINIC], 'Clínica'],
    [[SYSTEM, CLINIC], 'Sistema y Clínica'],
  ])('shows %j as «%s», the words of the buttons', (roleTypes, text) => {
    expect(describeUserType(roleTypes)).toBe(text);
  });

  it('decides by the id, not by the name the catalog gives', () => {
    expect(describeUserType([{ id: 1, name: 'Staff' }])).toBe('Sistema');
    expect(describeUserType([{ id: 2, name: 'Clinic' }])).toBe('Clínica');
  });

  it('uses the name of the catalog for a type the Backoffice does not know', () => {
    expect(describeUserType([{ id: 3, name: 'Externo' }])).toBe('Externo');
    expect(describeUserType([SYSTEM, { id: 3, name: 'Externo' }])).toBe('Sistema y Externo');
  });
});
