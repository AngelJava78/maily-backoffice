import { describe, expect, it } from 'vitest';

import { myAccessSchema } from './myAccess';

const userDto = {
  id: 121,
  auth0_id: 'auth0|abc123',
  email: 'ana@clinica.com',
  first_name: 'Ana',
  paternal_last_name: 'Pérez',
  maternal_last_name: null,
  status: { id: 1, name: 'Activo' },
  created_at: '2026-10-15T14:20:11.032Z',
  updated_at: '2026-10-15T14:20:11.032Z',
};

const validDto = {
  user: userDto,
  roles: [
    { id: 4, name: 'Marketing', permissions: ['tenants:read'] },
    { id: 5, name: 'Owner', permissions: [] },
  ],
};

describe('myAccessSchema', () => {
  it('converts the user to the domain model and keeps the roles with their permissions', () => {
    const access = myAccessSchema.parse(validDto);

    expect(access.user).toMatchObject({
      id: 121,
      auth0Id: 'auth0|abc123',
      firstName: 'Ana',
      paternalLastName: 'Pérez',
      maternalLastName: null,
      status: { id: 1, name: 'Activo' },
    });
    expect(access.roles).toEqual([
      { id: 4, name: 'Marketing', permissions: ['tenants:read'] },
      { id: 5, name: 'Owner', permissions: [] },
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

  it.each([
    'users:read',
    'users:write',
    'subscriptions:update',
    'tenants:delete',
    'roles_admin:read_all',
  ])('accepts the permission %s', (permission) => {
    const result = myAccessSchema.safeParse({
      user: userDto,
      roles: [{ id: 1, name: 'Administrator', permissions: [permission] }],
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
      roles: [{ id: 1, name: 'Administrator', permissions: [permission] }],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['a response without roles', { user: userDto }],
    ['a response without user', { roles: [] }],
    ['roles that are not a list', { user: userDto, roles: 'Marketing' }],
    ['a role without permissions', { user: userDto, roles: [{ id: 1, name: 'Marketing' }] }],
    ['a role with id 0', { user: userDto, roles: [{ id: 0, name: 'Marketing', permissions: [] }] }],
    [
      'a role with a fractional id',
      { user: userDto, roles: [{ id: 1.5, name: 'Marketing', permissions: [] }] },
    ],
    ['a role with an empty name', { user: userDto, roles: [{ id: 1, name: '', permissions: [] }] }],
    [
      'permissions that are not texts',
      { user: userDto, roles: [{ id: 1, name: 'Marketing', permissions: [7] }] },
    ],
    ['an invalid user', { user: { ...userDto, id: 0 }, roles: [] }],
    ['a body that is not an object', 'nope'],
    ['a null body', null],
  ])('rejects %s', (_label, body) => {
    expect(myAccessSchema.safeParse(body).success).toBe(false);
  });
});
