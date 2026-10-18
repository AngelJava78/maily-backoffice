import { describe, expect, it } from 'vitest';

import { getUserCapabilities } from './userCapabilities';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

const NOTHING = {
  canCreate: false,
  canEdit: false,
  canAddRoles: false,
  canRemoveRoles: false,
  canChangeStatus: false,
  canDelete: false,
};

describe('getUserCapabilities', () => {
  it('gives nothing to someone who cannot read the users, whatever else they have', () => {
    const access = accessWith(
      'users:write',
      'users:update',
      'users:delete',
      'roles:read',
      'tenants:read',
    );

    expect(getUserCapabilities(access)).toEqual(NOTHING);
  });

  it('gives nothing to someone without permissions', () => {
    expect(getUserCapabilities(accessWith())).toEqual(NOTHING);
  });

  it('gives nothing to someone who can only read the users', () => {
    expect(getUserCapabilities(accessWith('users:read'))).toEqual(NOTHING);
  });

  it('lets users:update edit, remove roles and change the status, but not add roles (FR-025)', () => {
    expect(getUserCapabilities(accessWith('users:read', 'users:update'))).toEqual({
      ...NOTHING,
      canEdit: true,
      canRemoveRoles: true,
      canChangeStatus: true,
    });
  });

  it('adds roles only with users:update and roles:read together (FR-025)', () => {
    expect(getUserCapabilities(accessWith('users:read', 'roles:read')).canAddRoles).toBe(false);
    expect(
      getUserCapabilities(accessWith('users:read', 'users:update', 'roles:read')).canAddRoles,
    ).toBe(true);
  });

  it('deletes only with users:delete', () => {
    expect(getUserCapabilities(accessWith('users:read', 'users:delete'))).toEqual({
      ...NOTHING,
      canDelete: true,
    });
  });

  it('creates a user only with users:write, users:update and roles:read together (FR-025)', () => {
    const all = ['users:read', 'users:write', 'users:update', 'roles:read'];

    expect(getUserCapabilities(accessWith(...all)).canCreate).toBe(true);
    for (const missing of ['users:write', 'users:update', 'roles:read']) {
      const access = accessWith(...all.filter((permission) => permission !== missing));
      expect(getUserCapabilities(access).canCreate).toBe(false);
    }
  });

  it('gives everything to an administrator with all the permissions of users and roles:read', () => {
    const access = accessWith(
      'users:read',
      'users:write',
      'users:update',
      'users:delete',
      'roles:read',
    );

    expect(getUserCapabilities(access)).toEqual({
      canCreate: true,
      canEdit: true,
      canAddRoles: true,
      canRemoveRoles: true,
      canChangeStatus: true,
      canDelete: true,
    });
  });
});
