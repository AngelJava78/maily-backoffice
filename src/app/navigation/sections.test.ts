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

    expect(visible.map((section) => section.id)).toEqual([
      'users',
      'subscription-types',
      'clinics',
    ]);
  });

  it('keeps the order of the registry', () => {
    const reversed = [...sampleSections].reverse();

    const visible = getVisibleSections(
      accessWith('users:read', 'subscriptions:read', 'tenants:read'),
      reversed,
    );

    expect(visible.map((section) => section.id)).toEqual([
      'clinics',
      'subscription-types',
      'users',
    ]);
  });

  it('returns nothing to someone without permissions', () => {
    expect(getVisibleSections(accessWith(), sampleSections)).toEqual([]);
  });

  it('returns nothing from an empty registry (FR-009)', () => {
    expect(getVisibleSections(accessWith('users:read', 'tenants:read'), [])).toEqual([]);
  });

  it('is empty in the registry of this feature: only implemented sections are listed', () => {
    expect(sections).toEqual([]);
  });
});
