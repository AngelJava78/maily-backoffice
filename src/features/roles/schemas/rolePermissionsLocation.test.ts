import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROLE_TYPE_TAB,
  parseRolePermissionsSearchParams,
  ROLE_TYPE_ID_OF_TAB,
  tabOfRoleTypeId,
  toRolePermissionsSearchParams,
} from './rolePermissionsLocation';

describe('parseRolePermissionsSearchParams', () => {
  it('defaults the tab to clinica and the role to none', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams())).toEqual({
      type: 'clinica',
      roleId: null,
    });
  });

  it('reads type=sistema', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('type=sistema')).type).toBe(
      'sistema',
    );
  });

  it('treats any other type value as absent (defaults to clinica)', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('type=x')).type).toBe('clinica');
  });

  it('reads a numeric roleId', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('roleId=6')).roleId).toBe(6);
  });

  it.each(['0', '-1', 'abc', '007'])('treats an invalid roleId %j as none', (roleId) => {
    expect(
      parseRolePermissionsSearchParams(new URLSearchParams(`roleId=${roleId}`)).roleId,
    ).toBeNull();
  });
});

describe('toRolePermissionsSearchParams', () => {
  it('omits what is the default', () => {
    const params = toRolePermissionsSearchParams({ type: 'clinica', roleId: null });

    expect([...params.keys()]).toEqual([]);
  });

  it('writes a non-default type and a present roleId', () => {
    const params = toRolePermissionsSearchParams({ type: 'sistema', roleId: 6 });

    expect(params.get('type')).toBe('sistema');
    expect(params.get('roleId')).toBe('6');
  });
});

describe('ROLE_TYPE_ID_OF_TAB', () => {
  it('maps clinica to 2 and sistema to 1', () => {
    expect(ROLE_TYPE_ID_OF_TAB[DEFAULT_ROLE_TYPE_TAB]).toBe(2);
    expect(ROLE_TYPE_ID_OF_TAB.sistema).toBe(1);
  });
});

describe('tabOfRoleTypeId', () => {
  it('is the inverse of ROLE_TYPE_ID_OF_TAB', () => {
    expect(tabOfRoleTypeId(1)).toBe('sistema');
    expect(tabOfRoleTypeId(2)).toBe('clinica');
  });
});
