import { describe, expect, it } from 'vitest';

import { myAccessSchema } from './myAccess';
import { uuidOf } from '@/test/ids';

const userDto = {
  id: uuidOf(121),
  auth0_id: 'auth0|abc123',
  email: 'ana@clinica.com',
  first_name: 'Ana',
  paternal_last_name: 'Pérez',
  maternal_last_name: null,
  status: { id: 1, name: 'Activo' },
  created_at: '2026-10-15T14:20:11.032Z',
  updated_at: '2026-10-15T14:20:11.032Z',
};

const SYSTEM_TYPE = { id: 1, name: 'Sistema' };
const CLINIC_TYPE = { id: 2, name: 'Clínica' };

const validDto = {
  user: userDto,
  roles: [
    { id: 4, name: 'Marketing', type: SYSTEM_TYPE, permissions: ['tenants:read'] },
    { id: 5, name: 'Owner', type: CLINIC_TYPE, permissions: [] },
  ],
};

describe('myAccessSchema', () => {
  it('converts the user to the domain model and keeps the roles with their type and permissions', () => {
    const access = myAccessSchema.parse(validDto);

    expect(access.user).toMatchObject({
      id: uuidOf(121),
      auth0Id: 'auth0|abc123',
      firstName: 'Ana',
      paternalLastName: 'Pérez',
      maternalLastName: null,
      status: { id: 1, name: 'Activo' },
    });
    expect(access.roles).toEqual([
      { id: 4, name: 'Marketing', type: SYSTEM_TYPE, permissions: ['tenants:read'] },
      { id: 5, name: 'Owner', type: CLINIC_TYPE, permissions: [] },
    ]);
  });

  it('accepts an unregistered person: no user and no roles', () => {
    expect(myAccessSchema.parse({ user: null, roles: [] })).toEqual({ user: null, roles: [] });
  });

  it('accepts a user that has no roles', () => {
    expect(myAccessSchema.parse({ user: userDto, roles: [] }).roles).toEqual([]);
  });

  it('accepts a blocked user, which the service returns with an empty role list', () => {
    const access = myAccessSchema.parse({
      user: { ...userDto, status: { id: 2, name: 'Bloqueado' } },
      roles: [],
    });

    expect(access.user?.status.id).toBe(2);
  });

  // The Backoffice does not decide access here (that is evaluateAccess, policy/evaluateAccess.ts):
  // the schema only validates the shape, so a role of either type parses the same way (feature 006).
  it.each([
    ['of type Sistema', SYSTEM_TYPE],
    ['of type Clínica', CLINIC_TYPE],
    ['of an unknown type', { id: 99, name: 'Futuro' }],
  ])('accepts a role %s', (_label, type) => {
    const result = myAccessSchema.safeParse({
      user: userDto,
      roles: [{ id: 1, name: 'Marketing', type, permissions: [] }],
    });

    expect(result.success).toBe(true);
  });

  // FR-010: the pending-password-change indication travels with the response but is not part of
  // this schema (Zod drops fields it does not declare, without `.strict()`); its presence must
  // not change what is parsed or, through evaluateAccess, the access decision.
  it('ignores password_change_required and does not let it change what is parsed', () => {
    const withFlag = myAccessSchema.parse({ ...validDto, password_change_required: true });
    const withoutFlag = myAccessSchema.parse(validDto);

    expect(withFlag).toEqual(withoutFlag);
    expect(withFlag).not.toHaveProperty('password_change_required');
  });

  it.each([
    'users:read',
    'users:write',
    'subscriptions:update',
    'tenants:delete',
    'roles_admin:read_all',
  ])('accepts the permission %s', (permission) => {
    const result = myAccessSchema.safeParse({
      user: userDto,
      roles: [{ id: 1, name: 'Administrator', type: SYSTEM_TYPE, permissions: [permission] }],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    'Users:Read',
    'users',
    'users:',
    ':read',
    'users:read:extra',
    'users: read',
    '1users:read',
    'users:1read',
    'users-admin:read',
    '',
  ])('rejects the permission %j', (permission) => {
    const result = myAccessSchema.safeParse({
      user: userDto,
      roles: [{ id: 1, name: 'Administrator', type: SYSTEM_TYPE, permissions: [permission] }],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['a response without roles', { user: userDto }],
    ['a response without user', { roles: [] }],
    ['roles that are not a list', { user: userDto, roles: 'Marketing' }],
    [
      'a role without permissions',
      { user: userDto, roles: [{ id: 1, name: 'Marketing', type: SYSTEM_TYPE }] },
    ],
    [
      'a role with id 0',
      { user: userDto, roles: [{ id: 0, name: 'Marketing', type: SYSTEM_TYPE, permissions: [] }] },
    ],
    [
      'a role with a fractional id',
      {
        user: userDto,
        roles: [{ id: 1.5, name: 'Marketing', type: SYSTEM_TYPE, permissions: [] }],
      },
    ],
    [
      'a role with an empty name',
      { user: userDto, roles: [{ id: 1, name: '', type: SYSTEM_TYPE, permissions: [] }] },
    ],
    [
      'permissions that are not texts',
      { user: userDto, roles: [{ id: 1, name: 'Marketing', type: SYSTEM_TYPE, permissions: [7] }] },
    ],
    // FR-002 / data-model.md: a role without a type, or with an invalid one, is a contract
    // violation — the response is rejected whole, never parsed with a guessed type.
    [
      'a role without a type',
      { user: userDto, roles: [{ id: 1, name: 'Marketing', permissions: [] }] },
    ],
    [
      'a role with type id 0',
      {
        user: userDto,
        roles: [{ id: 1, name: 'Marketing', type: { id: 0, name: 'Sistema' }, permissions: [] }],
      },
    ],
    [
      'a role with a fractional type id',
      {
        user: userDto,
        roles: [{ id: 1, name: 'Marketing', type: { id: 1.5, name: 'Sistema' }, permissions: [] }],
      },
    ],
    [
      'a role with a type that has no id',
      {
        user: userDto,
        roles: [{ id: 1, name: 'Marketing', type: { name: 'Sistema' }, permissions: [] }],
      },
    ],
    [
      'a role with a type that has an empty name',
      {
        user: userDto,
        roles: [{ id: 1, name: 'Marketing', type: { id: 1, name: '' }, permissions: [] }],
      },
    ],
    ['an invalid user', { user: { ...userDto, id: 0 }, roles: [] }],
    ['a body that is not an object', 'nope'],
    ['a null body', null],
  ])('rejects %s', (_label, body) => {
    expect(myAccessSchema.safeParse(body).success).toBe(false);
  });
});
