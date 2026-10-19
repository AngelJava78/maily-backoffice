import { describe, expect, it } from 'vitest';

import { roleRecordDto } from '@/test/factories';

import { roleSchema, rolesSchema, userRoleAssignmentSchema } from './role';

describe('roleSchema', () => {
  it('turns the DTO of the service into the domain model', () => {
    const role = roleSchema.parse(
      roleRecordDto({ id: 4, name: 'Marketing', description: 'Campañas' }),
    );

    expect(role).toEqual({
      id: 4,
      name: 'Marketing',
      description: 'Campañas',
      createdAt: '2026-10-15T05:57:30.521Z',
      status: { id: 1, name: 'Activo' },
    });
  });

  it('accepts a role without description', () => {
    expect(roleSchema.parse(roleRecordDto({ description: null })).description).toBeNull();
  });

  it('accepts the longest name and description the service allows', () => {
    const role = roleSchema.parse(
      roleRecordDto({ name: 'N'.repeat(50), description: 'D'.repeat(500) }),
    );

    expect(role.name).toHaveLength(50);
    expect(role.description).toHaveLength(500);
  });

  it.each([
    ['an id below 1', { id: 0 }],
    ['an empty name', { name: '' }],
    ['a name of more than 50 characters', { name: 'N'.repeat(51) }],
    ['a description of more than 500 characters', { description: 'D'.repeat(501) }],
    ['a creation date without a zone', { created_at: '2026-10-15T05:57:30' }],
    ['a status without id', { status: { name: 'Activo' } }],
  ])('rejects %s', (_label, overrides) => {
    expect(roleSchema.safeParse({ ...roleRecordDto(), ...overrides }).success).toBe(false);
  });
});

describe('rolesSchema', () => {
  it('parses a list of roles, which may be empty', () => {
    const roles = rolesSchema.parse([
      roleRecordDto({ id: 1, name: 'Administrator' }),
      roleRecordDto({ id: 4, name: 'Marketing' }),
    ]);

    expect(roles.map((role) => role.name)).toEqual(['Administrator', 'Marketing']);
    expect(rolesSchema.parse([])).toEqual([]);
  });

  it('rejects a list with a role that does not meet the contract', () => {
    expect(rolesSchema.safeParse([roleRecordDto(), roleRecordDto({ name: '' })]).success).toBe(
      false,
    );
  });
});

describe('userRoleAssignmentSchema', () => {
  it('turns the answer of assigning a role into the domain model', () => {
    const assignment = userRoleAssignmentSchema.parse({
      user_id: 121,
      role: { id: 4, name: 'Marketing' },
    });

    expect(assignment).toEqual({ userId: 121, role: { id: 4, name: 'Marketing' } });
  });

  it.each([
    ['a user id of 0', { user_id: 0, role: { id: 4, name: 'Marketing' } }],
    ['a role id of 0', { user_id: 121, role: { id: 0, name: 'Marketing' } }],
    ['a role without name', { user_id: 121, role: { id: 4 } }],
    ['no role', { user_id: 121 }],
  ])('rejects %s', (_label, dto) => {
    expect(userRoleAssignmentSchema.safeParse(dto).success).toBe(false);
  });
});
