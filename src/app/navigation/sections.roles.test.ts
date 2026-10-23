import { describe, expect, it } from 'vitest';

import { can, hasAnythingToSee, type PermissionAction } from '@/features/auth/policy/permissions';
import { evaluateAccess } from '@/features/auth/policy/evaluateAccess';
import { myAccessSchema } from '@/features/auth/schemas/myAccess';
import { myAccessDto, roleDto } from '@/test/factories';
import { sampleSections } from '@/test/sampleSections';

import { getVisibleSections } from './sections';

const ACTIONS: readonly PermissionAction[] = ['read', 'write', 'update', 'delete'];
/**
 * The three sections `sampleSections` stands for (features 002 to 004). Deliberately not
 * `SECTION_RESOURCES` from the policy module: this file is about these three specifically, and
 * must not change just because a later feature (014: Roles y permisos) adds a resource of its own.
 */
const SAMPLE_RESOURCES = ['users', 'subscriptions', 'tenants'] as const;

/** Every `resource:action` pair of the three sections, for a role that has them all. */
function allPermissions(resources: readonly string[]): string[] {
  return resources.flatMap((resource) => ACTIONS.map((action) => `${resource}:${action}`));
}

/** The roles of step 2 of the quickstart, with the permissions the platform assigns them. */
const administrator = roleDto({
  id: 1,
  name: 'Administrator',
  // The platform also gives it permissions on roles (its own section since feature 014, exercised
  // in roles.*.test.ts, not here) and on permissions (still no section of its own).
  permissions: [
    ...allPermissions(['users', 'subscriptions', 'tenants']),
    ...allPermissions(['roles', 'permissions']),
  ],
});
const marketing = roleDto({ id: 2, name: 'Marketing', permissions: ['tenants:read'] });
const billing = roleDto({ id: 3, name: 'Billing', permissions: allPermissions(['subscriptions']) });
const developer = roleDto({ id: 4, name: 'Developer', permissions: [] });
// Owner is of type Clínica (feature 006): whatever it grants must not count. `roleDto`'s default
// type is now Sistema, so this needs the override (research D8).
const owner = roleDto({
  id: 5,
  name: 'Owner',
  type: { id: 2, name: 'Clínica' },
  permissions: ['clinics:read', 'clinics:write', 'users:read', 'tenants:update'],
});

/** The pairs `resource:action` for which `can` answers yes, over the three known resources. */
function allowedActions(permissions: ReadonlySet<string>): string[] {
  return SAMPLE_RESOURCES.flatMap((resource) =>
    ACTIONS.filter((action) => can({ permissions }, { resource, action })).map(
      (action) => `${resource}:${action}`,
    ),
  );
}

function resolve(...roles: ReturnType<typeof roleDto>[]) {
  const decision = evaluateAccess(myAccessSchema.parse(myAccessDto({ roles })));
  if (decision.kind !== 'granted') {
    throw new Error('Expected access to be granted, it was denied');
  }
  return decision.access;
}

describe('sections and actions per role (SC-007, FR-017)', () => {
  it('Administrator sees the three sections and the 12 actions', () => {
    const access = resolve(administrator);

    expect(getVisibleSections(access, sampleSections).map((section) => section.id)).toEqual([
      'users',
      'subscriptions',
      'clinics',
    ]);
    expect(allowedActions(access.permissions)).toEqual(
      allPermissions(['users', 'subscriptions', 'tenants']),
    );
    expect(allowedActions(access.permissions)).toHaveLength(12);
  });

  it('Marketing sees only Clinics, and only to read', () => {
    const access = resolve(marketing);

    expect(getVisibleSections(access, sampleSections).map((section) => section.id)).toEqual([
      'clinics',
    ]);
    expect(allowedActions(access.permissions)).toEqual(['tenants:read']);
  });

  it('Billing sees only Subscriptions, with its four actions', () => {
    const access = resolve(billing);

    expect(getVisibleSections(access, sampleSections).map((section) => section.id)).toEqual([
      'subscriptions',
    ]);
    expect(allowedActions(access.permissions)).toEqual(allPermissions(['subscriptions']));
  });

  it('Developer sees no section and is told it has no permissions', () => {
    const access = resolve(developer);

    expect(getVisibleSections(access, sampleSections)).toEqual([]);
    expect(allowedActions(access.permissions)).toEqual([]);
    expect(hasAnythingToSee(access)).toBe(false);
  });

  it('Marketing together with Owner behaves as Marketing alone', () => {
    const access = resolve(marketing, owner);

    expect(getVisibleSections(access, sampleSections).map((section) => section.id)).toEqual([
      'clinics',
    ]);
    expect(allowedActions(access.permissions)).toEqual(['tenants:read']);
    expect(hasAnythingToSee(access)).toBe(true);
  });

  it('shows neither the section nor any action when write exists without read', () => {
    const access = resolve(roleDto({ id: 6, name: 'Billing', permissions: ['users:write'] }));

    expect(getVisibleSections(access, sampleSections)).toEqual([]);
    expect(allowedActions(access.permissions)).toEqual([]);
    expect(hasAnythingToSee(access)).toBe(false);
  });

  it('matches the permissions of the authorized roles exactly, for every combination', () => {
    const combinations = [
      [administrator],
      [marketing],
      [billing],
      [developer],
      [marketing, owner],
      [billing, marketing],
    ];

    for (const roles of combinations) {
      const access = resolve(...roles);
      const expected = new Set(
        roles
          .filter((role) => role.name !== 'Owner')
          .flatMap((role) => role.permissions)
          .filter((permission) =>
            SAMPLE_RESOURCES.some((resource) => permission.startsWith(`${resource}:`)),
          ),
      );

      expect(new Set(allowedActions(access.permissions))).toEqual(expected);
      expect(getVisibleSections(access, sampleSections).map((section) => section.resource)).toEqual(
        sampleSections
          .filter((section) => expected.has(`${section.resource}:read`))
          .map((section) => section.resource),
      );
    }
  });
});
