import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { getVisibleSections, sections } from './sections';

function accessWith(...permissions: string[]) {
  return { permissions: new Set(permissions) };
}

describe('the Token entry of the navigation (feature 005)', () => {
  it('is registered behind the sections, with its route and its resource (contracts/app-routes.md)', () => {
    expect(sections).toContainEqual({
      id: 'token',
      path: '/tools/postman-token',
      labelKey: 'token',
      resource: 'token',
      icon: 'token',
    });
    expect(sections.map((section) => section.id)).toEqual(['users', 'subscriptions', 'token']);
  });

  it('is called Token', () => {
    expect(messages.nav.sections.token).toBe('Token');
  });

  it('is offered only to who has token:read', () => {
    expect(getVisibleSections(accessWith('token:read'), sections).map((s) => s.id)).toEqual([
      'token',
    ]);
    expect(getVisibleSections(accessWith(), sections)).toEqual([]);
    expect(getVisibleSections(accessWith('users:read'), sections).map((s) => s.id)).toEqual([
      'users',
    ]);
  });

  it('comes after Usuarios for who has both permissions', () => {
    const visible = getVisibleSections(accessWith('users:read', 'token:read'), sections);

    expect(visible.map((section) => section.id)).toEqual(['users', 'token']);
  });
});
