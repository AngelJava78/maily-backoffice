import { describe, expect, it } from 'vitest';

import { sampleSections } from '@/test/sampleSections';

import { getVisibleSections, sections } from './sections';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

describe('getVisibleSections', () => {
  it('returns only the sections whose resource the person can read', () => {
    const visible = getVisibleSections(accessWith('tenants:read', 'users:write'), sampleSections);

    expect(visible.map((section) => section.id)).toEqual(['clinics']);
  });

  it('returns every section to someone who can read all the resources', () => {
    const visible = getVisibleSections(
      accessWith('users:read', 'subscriptions:read', 'tenants:read'),
      sampleSections,
    );

    expect(visible.map((section) => section.id)).toEqual(['users', 'subscriptions', 'clinics']);
  });

  it('keeps the order of the registry', () => {
    const reversed = [...sampleSections].reverse();

    const visible = getVisibleSections(
      accessWith('users:read', 'subscriptions:read', 'tenants:read'),
      reversed,
    );

    expect(visible.map((section) => section.id)).toEqual(['clinics', 'subscriptions', 'users']);
  });

  it('returns nothing to someone without permissions', () => {
    expect(getVisibleSections(accessWith(), sampleSections)).toEqual([]);
  });

  it('returns nothing from an empty registry (FR-009)', () => {
    expect(getVisibleSections(accessWith('users:read', 'tenants:read'), [])).toEqual([]);
  });

  // The registry lists only the sections that exist (FR-009): each feature adds its own. The order
  // (FR-002 of feature 013) is Panel, Roles y permisos, Usuarios, Suscripciones, Token, until
  // Módulos and Clínicas become sections of their own (they are inserted before Roles y permisos
  // and after Suscripciones respectively, to reach the final order the feature documents).
  it('registers Roles y permisos (feature 013) first, then users (002), subscriptions (003) and the Token tool (005)', () => {
    expect(sections).toEqual([
      { id: 'roles', path: '/roles', labelKey: 'roles', resource: 'roles', icon: 'roles' },
      { id: 'users', path: '/users', labelKey: 'users', resource: 'users', icon: 'users' },
      {
        id: 'subscriptions',
        path: '/subscriptions',
        labelKey: 'subscriptions',
        resource: 'subscriptions',
        icon: 'subscriptions',
      },
      {
        id: 'token',
        path: '/tools/postman-token',
        labelKey: 'token',
        resource: 'token',
        icon: 'token',
      },
    ]);
  });

  it('shows the users section only to someone who can read the users', () => {
    expect(
      getVisibleSections(accessWith('users:read'), sections).map((section) => section.id),
    ).toEqual(['users']);
    expect(getVisibleSections(accessWith('users:write', 'tenants:read'), sections)).toEqual([]);
  });

  it('shows the subscriptions section only to someone who can read the subscriptions', () => {
    expect(
      getVisibleSections(accessWith('subscriptions:read'), sections).map((section) => section.id),
    ).toEqual(['subscriptions']);
    expect(
      getVisibleSections(
        accessWith('subscriptions:write', 'subscriptions:update', 'subscriptions:delete'),
        sections,
      ),
    ).toEqual([]);
  });
});
