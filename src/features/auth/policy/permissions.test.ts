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
  it('lists the three resources that have a section', () => {
    expect([...SECTION_RESOURCES]).toEqual(RESOURCES);
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
    expect([...PERMISSION_RESOURCES]).toEqual([...RESOURCES, 'roles']);
    expect([...SECTION_RESOURCES]).toEqual(RESOURCES);
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
