import { describe, expect, it } from 'vitest';

import {
  can,
  hasAnySectionPermission,
  PERMISSION_RESOURCES,
  SECTION_RESOURCES,
  type PermissionAction,
  type SectionResource,
} from './permissions';

const RESOURCES: readonly SectionResource[] = ['users', 'subscriptions', 'tenants'];
const ACTIONS: readonly PermissionAction[] = ['read', 'write', 'update', 'delete'];

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

describe('SECTION_RESOURCES', () => {
  it('lists the three sections and the token tool (feature 005)', () => {
    expect([...SECTION_RESOURCES]).toEqual([...RESOURCES, 'token']);
  });
});

describe('can', () => {
  it('allows the 12 combinations to someone who has every permission', () => {
    const access = accessWith(
      ...RESOURCES.flatMap((resource) => ACTIONS.map((action) => `${resource}:${action}`)),
    );

    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        expect(can(access, { resource, action })).toBe(true);
      }
    }
  });

  it('allows only reading a resource to someone who has just its read permission', () => {
    const access = accessWith('tenants:read');

    expect(can(access, { resource: 'tenants', action: 'read' })).toBe(true);
    expect(can(access, { resource: 'tenants', action: 'write' })).toBe(false);
    expect(can(access, { resource: 'tenants', action: 'update' })).toBe(false);
    expect(can(access, { resource: 'tenants', action: 'delete' })).toBe(false);
    expect(can(access, { resource: 'users', action: 'read' })).toBe(false);
    expect(can(access, { resource: 'subscriptions', action: 'read' })).toBe(false);
  });

  it('allows an action only together with the read permission of its section', () => {
    const access = accessWith('subscriptions:read', 'subscriptions:update');

    expect(can(access, { resource: 'subscriptions', action: 'update' })).toBe(true);
    expect(can(access, { resource: 'subscriptions', action: 'delete' })).toBe(false);
  });

  it('offers no action of a section that cannot be viewed', () => {
    const access = accessWith('users:write', 'users:update', 'users:delete');

    for (const action of ACTIONS) {
      expect(can(access, { resource: 'users', action })).toBe(false);
    }
  });

  it('denies everything to someone without permissions', () => {
    const access = accessWith();

    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        expect(can(access, { resource, action })).toBe(false);
      }
    }
  });

  it('does not mix the permissions of different resources', () => {
    const access = accessWith('users:read', 'subscriptions:write');

    expect(can(access, { resource: 'subscriptions', action: 'write' })).toBe(false);
    expect(can(access, { resource: 'users', action: 'write' })).toBe(false);
  });
});

describe('hasAnySectionPermission', () => {
  it.each(RESOURCES)('is true with the read permission of %s', (resource) => {
    expect(hasAnySectionPermission(accessWith(`${resource}:read`))).toBe(true);
  });

  it('is false without permissions', () => {
    expect(hasAnySectionPermission(accessWith())).toBe(false);
  });

  it('is false when the only permissions are not read permissions', () => {
    expect(hasAnySectionPermission(accessWith('users:write', 'tenants:delete'))).toBe(false);
  });

  it('is false when the only read permissions belong to resources without a section', () => {
    expect(hasAnySectionPermission(accessWith('roles:read', 'clinics:read'))).toBe(false);
  });

  it('is false with only roles:read: the roles are read to assign them, they have no section', () => {
    expect(hasAnySectionPermission(accessWith('roles:read'))).toBe(false);
  });
});

describe('the roles resource (feature 002)', () => {
  it('is a permission resource without a section of its own', () => {
    expect([...PERMISSION_RESOURCES]).toEqual([...RESOURCES, 'token', 'roles']);
    expect([...SECTION_RESOURCES]).toEqual([...RESOURCES, 'token']);
  });

  it('is read with roles:read alone, without needing users:read', () => {
    expect(can(accessWith('roles:read'), { resource: 'roles', action: 'read' })).toBe(true);
    expect(can(accessWith('users:read'), { resource: 'roles', action: 'read' })).toBe(false);
    expect(can(accessWith(), { resource: 'roles', action: 'read' })).toBe(false);
  });

  it('follows the rule of every resource: another action needs the read permission first', () => {
    expect(can(accessWith('roles:update'), { resource: 'roles', action: 'update' })).toBe(false);
    expect(
      can(accessWith('roles:read', 'roles:update'), { resource: 'roles', action: 'update' }),
    ).toBe(true);
  });

  it('does not let roles:read replace users:read for the actions on users', () => {
    const access = accessWith('roles:read', 'users:update');

    expect(can(access, { resource: 'users', action: 'update' })).toBe(false);
    expect(can(access, { resource: 'users', action: 'read' })).toBe(false);
  });
});

describe('the token resource (feature 005)', () => {
  it('lets someone with token:read use the tool', () => {
    expect(can(accessWith('token:read'), { resource: 'token', action: 'read' })).toBe(true);
  });

  it('denies the tool to someone without token:read, whatever else they can do (FR-001, FR-004)', () => {
    expect(can(accessWith(), { resource: 'token', action: 'read' })).toBe(false);
    expect(can(accessWith('users:read'), { resource: 'token', action: 'read' })).toBe(false);
  });

  it('follows the rule of every resource: another action needs the read permission first', () => {
    expect(can(accessWith('token:write'), { resource: 'token', action: 'write' })).toBe(false);
    expect(
      can(accessWith('token:read', 'token:write'), { resource: 'token', action: 'write' }),
    ).toBe(true);
  });

  it('counts for the notice of "no permissions assigned": who only has the tool is not told they have nothing', () => {
    expect(hasAnySectionPermission(accessWith('token:read'))).toBe(true);
    expect(hasAnySectionPermission(accessWith('token:write'))).toBe(false);
  });
});
