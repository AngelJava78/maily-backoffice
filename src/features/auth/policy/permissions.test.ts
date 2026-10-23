import { describe, expect, it } from 'vitest';

import {
  can,
  hasAnythingToSee,
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
  it('lists the three sections, the token tool (feature 005) and roles (feature 014)', () => {
    expect([...SECTION_RESOURCES]).toEqual([...RESOURCES, 'token', 'roles']);
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

describe('hasAnythingToSee', () => {
  it.each([
    'users:read',
    'subscriptions:read',
    'tenants:read',
    'token:read',
    'roles:read',
    'dashboard:read',
  ])('is true with %s alone', (permission) => {
    expect(hasAnythingToSee(accessWith(permission))).toBe(true);
  });

  it('is false without permissions', () => {
    expect(hasAnythingToSee(accessWith())).toBe(false);
  });

  it('is false when the only permissions are not read permissions', () => {
    expect(hasAnythingToSee(accessWith('users:write', 'tenants:delete'))).toBe(false);
  });

  it('is false when the only read permission belongs to a resource with neither a section nor a nav entry', () => {
    // `clinics` is not (yet) one of PERMISSION_RESOURCES: an unrelated read permission never counts.
    expect(hasAnythingToSee(accessWith('clinics:read'))).toBe(false);
  });
});

describe('the roles resource (features 002, 014)', () => {
  it('is both a section of its own (Roles y permisos) and a permission resource', () => {
    expect([...PERMISSION_RESOURCES]).toEqual([...RESOURCES, 'token', 'roles', 'dashboard']);
    expect([...SECTION_RESOURCES]).toEqual([...RESOURCES, 'token', 'roles']);
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
    expect(hasAnythingToSee(accessWith('token:read'))).toBe(true);
    expect(hasAnythingToSee(accessWith('token:write'))).toBe(false);
  });
});

describe('the dashboard resource (feature 007)', () => {
  it('is a permission resource without a section: the Panel is always in the navigation', () => {
    expect(PERMISSION_RESOURCES).toContain('dashboard');
    expect(SECTION_RESOURCES).not.toContain('dashboard');
    expect([...SECTION_RESOURCES]).toEqual(['users', 'subscriptions', 'tenants', 'token', 'roles']);
  });

  it('lets read the indicators if and only if dashboard:read is there', () => {
    const read = { resource: 'dashboard', action: 'read' } as const;

    expect(can(accessWith('dashboard:read'), read)).toBe(true);
    expect(can(accessWith('dashboard:read', 'users:read'), read)).toBe(true);
    expect(can(accessWith(), read)).toBe(false);
    expect(can(accessWith('users:read', 'subscriptions:read', 'token:read'), read)).toBe(false);
    expect(can(accessWith('dashboard:write'), read)).toBe(false);
  });

  it('counts for the notice of "no permissions assigned": who only sees the indicators is not told they have nothing (FR-012)', () => {
    expect(hasAnythingToSee(accessWith('dashboard:read'))).toBe(true);
  });
});
