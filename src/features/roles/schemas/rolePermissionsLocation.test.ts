import { describe, expect, it } from 'vitest';

import type { Role } from './role';
import {
  detailOf,
  locationAfterCreate,
  parseRolePermissionsSearchParams,
  ROLE_TYPE_ID_OF_FILTER,
  rolesOfType,
  toRolePermissionsSearchParams,
  typeFilterOfRoleTypeId,
  type RolePermissionsLocation,
} from './rolePermissionsLocation';

function role(id: number, typeId: 1 | 2, statusId = 1): Role {
  return {
    id,
    name: `Role ${id}`,
    description: null,
    createdAt: '2026-10-15T05:57:30.521Z',
    status: { id: statusId, name: statusId === 1 ? 'Activo' : 'Bloqueado' },
    type: { id: typeId, name: typeId === 1 ? 'Sistema' : 'Clínica' },
  };
}

const DEFAULTS: RolePermissionsLocation = { type: 'all', status: 'active', roleId: null };

describe('parseRolePermissionsSearchParams', () => {
  it('defaults to Todos, Activos and no role (FR-004)', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams())).toEqual(DEFAULTS);
  });

  it.each([
    ['type=sistema', 'system'],
    ['type=clinica', 'clinic'],
  ] as const)('reads %s, the same values the old tabs used (FR-009)', (search, type) => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).type).toBe(type);
  });

  it('reads status=bloqueados', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('status=bloqueados')).status).toBe(
      'blocked',
    );
  });

  it.each(['type=x', 'type=all', 'type=system', 'type=SISTEMA', 'type='])(
    'treats %j as Todos (US4-3)',
    (search) => {
      expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).type).toBe('all');
    },
  );

  it.each(['status=x', 'status=blocked', 'status=activos', 'status='])(
    'treats %j as Activos (US4-3)',
    (search) => {
      expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).status).toBe('active');
    },
  );

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
    expect(toRolePermissionsSearchParams(DEFAULTS).toString()).toBe('');
  });

  it('writes type, status and roleId, in that order', () => {
    const params = toRolePermissionsSearchParams({ type: 'clinic', status: 'blocked', roleId: 6 });

    expect(params.toString()).toBe('type=clinica&status=bloqueados&roleId=6');
  });

  it.each([
    'type=sistema',
    'type=clinica&roleId=7',
    'status=bloqueados',
    'type=sistema&status=bloqueados&roleId=3',
  ])('round-trips the canonical address %j unchanged', (search) => {
    const location = parseRolePermissionsSearchParams(new URLSearchParams(search));

    expect(toRolePermissionsSearchParams(location).toString()).toBe(search);
  });

  it('turns an address with invalid values into its normal form', () => {
    const location = parseRolePermissionsSearchParams(
      new URLSearchParams('type=xyz&status=borrados&roleId=007'),
    );

    expect(toRolePermissionsSearchParams(location).toString()).toBe('');
  });
});

describe('ROLE_TYPE_ID_OF_FILTER and typeFilterOfRoleTypeId', () => {
  it('map Sistema to 1 and Clínica to 2, both ways', () => {
    expect(ROLE_TYPE_ID_OF_FILTER.system).toBe(1);
    expect(ROLE_TYPE_ID_OF_FILTER.clinic).toBe(2);
    expect(typeFilterOfRoleTypeId(1)).toBe('system');
    expect(typeFilterOfRoleTypeId(2)).toBe('clinic');
  });
});

describe('rolesOfType', () => {
  const roles = [role(1, 1), role(6, 2), role(2, 1)];

  it('keeps every role, in the same order, with Todos', () => {
    expect(rolesOfType(roles, 'all')).toEqual(roles);
  });

  it('keeps only the roles of the type, in the same order', () => {
    expect(rolesOfType(roles, 'system').map(({ id }) => id)).toEqual([1, 2]);
    expect(rolesOfType(roles, 'clinic').map(({ id }) => id)).toEqual([6]);
  });
});

describe('locationAfterCreate (FR-010)', () => {
  const system = { id: 10, type: { id: 1 as const } };
  const clinic = { id: 11, type: { id: 2 as const } };

  it('keeps Todos, switches to Activos and selects the new role', () => {
    expect(locationAfterCreate({ type: 'all', status: 'blocked', roleId: 3 }, system)).toEqual({
      type: 'all',
      status: 'active',
      roleId: 10,
    });
  });

  it('keeps a type filter that already includes the new role', () => {
    expect(locationAfterCreate({ type: 'clinic', status: 'active', roleId: null }, clinic)).toEqual(
      { type: 'clinic', status: 'active', roleId: 11 },
    );
  });

  it('switches the type filter only when it does not include the new role', () => {
    expect(
      locationAfterCreate({ type: 'clinic', status: 'blocked', roleId: null }, system),
    ).toEqual({ type: 'system', status: 'active', roleId: 10 });
  });
});

describe('detailOf (data-model §4)', () => {
  const visible = [role(1, 1), role(2, 1)];

  it('shows nothing without a role in the address', () => {
    expect(
      detailOf({ location: DEFAULTS, isLoading: false, visibleRoles: visible, lastShownRoleId: 1 }),
    ).toEqual({ kind: 'none' });
  });

  it('waits while the list of the status is loading', () => {
    expect(
      detailOf({
        location: { ...DEFAULTS, roleId: 1 },
        isLoading: true,
        visibleRoles: [],
        lastShownRoleId: null,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('opens a visible active role in the usual detail', () => {
    expect(
      detailOf({
        location: { ...DEFAULTS, roleId: 2 },
        isLoading: false,
        visibleRoles: visible,
        lastShownRoleId: null,
      }),
    ).toEqual({ kind: 'active', roleId: 2 });
  });

  it('opens a visible blocked role in its own detail, with the role of the list', () => {
    const blocked = role(4, 2, 2);

    expect(
      detailOf({
        location: { type: 'all', status: 'blocked', roleId: 4 },
        isLoading: false,
        visibleRoles: [blocked],
        lastShownRoleId: null,
      }),
    ).toEqual({ kind: 'blocked', role: blocked });
  });

  it('does not open a role the filters do not show (FR-011)', () => {
    expect(
      detailOf({
        location: { ...DEFAULTS, roleId: 4 },
        isLoading: false,
        visibleRoles: visible,
        lastShownRoleId: null,
      }),
    ).toEqual({ kind: 'none' });
  });

  it('keeps the usual detail of an active role that disappeared while it was open', () => {
    expect(
      detailOf({
        location: { ...DEFAULTS, roleId: 4 },
        isLoading: false,
        visibleRoles: visible,
        lastShownRoleId: 4,
      }),
    ).toEqual({ kind: 'active', roleId: 4 });
  });

  it('shows nothing for a blocked role that disappeared, even if it had been shown', () => {
    expect(
      detailOf({
        location: { type: 'all', status: 'blocked', roleId: 4 },
        isLoading: false,
        visibleRoles: [],
        lastShownRoleId: 4,
      }),
    ).toEqual({ kind: 'none' });
  });
});
