import { describe, expect, it } from 'vitest';

import {
  modulesCatalogKeys,
  permissionsCatalogKeys,
  roleKeys,
  roleTypesCatalogKeys,
} from './roleKeys';

describe('roleKeys', () => {
  it('nests list, detail and permissions under a common root, each distinct', () => {
    expect(roleKeys.lists()).toEqual(['roles', 'list']);
    expect(roleKeys.detail(6)).toEqual(['roles', 'detail', 6]);
    expect(roleKeys.permissions(6)).toEqual(['roles', 'detail', 6, 'permissions']);
    expect(roleKeys.detail(6)).not.toEqual(roleKeys.detail(7));
  });
});

describe('catalog keys', () => {
  it('are stable and distinct from each other and from roleKeys', () => {
    expect(permissionsCatalogKeys.all).toEqual(['rolesPermissionsCatalog']);
    expect(modulesCatalogKeys.byType(1)).toEqual(['rolesModulesCatalog', 1]);
    expect(modulesCatalogKeys.byType(2)).not.toEqual(modulesCatalogKeys.byType(1));
    expect(roleTypesCatalogKeys.all).toEqual(['roleTypesCatalog']);
  });
});
