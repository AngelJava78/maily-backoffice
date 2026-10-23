import { describe, expect, it } from 'vitest';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { filterModules } from './filterModules';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'appointments',
    name: 'Agenda y citas',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    actions: new Set(),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

describe('filterModules', () => {
  const users = module({ id: 1, key: 'users', name: 'Usuarios', typeId: MODULE_TYPE.SYSTEM });
  const appointments = module({ id: 2, key: 'appointments', name: 'Agenda y citas', typeId: MODULE_TYPE.CLINIC });
  const all = [users, appointments];

  it('keeps everything with type "all" and an empty search', () => {
    expect(filterModules(all, { type: 'all', search: '' })).toEqual(all);
  });

  it('filters by type', () => {
    expect(filterModules(all, { type: 'system', search: '' })).toEqual([users]);
    expect(filterModules(all, { type: 'clinic', search: '' })).toEqual([appointments]);
  });

  it('matches the search against the name, without distinguishing case', () => {
    expect(filterModules(all, { type: 'all', search: 'AGENDA' })).toEqual([appointments]);
  });

  it('matches the search against the key', () => {
    expect(filterModules(all, { type: 'all', search: 'users' })).toEqual([users]);
  });

  it('combines type and search', () => {
    expect(filterModules(all, { type: 'system', search: 'agenda' })).toEqual([]);
  });

  it('trims the search text', () => {
    expect(filterModules(all, { type: 'all', search: '  agenda  ' })).toEqual([appointments]);
  });
});
