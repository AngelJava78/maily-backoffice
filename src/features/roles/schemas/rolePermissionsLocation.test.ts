import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import type { Role } from './role';
import {
  DEFAULT_PAGE_SIZE,
  emptyRolesMessage,
  lastPageOf,
  legacyRoleIdOf,
  locationAfterCreate,
  locationSearch,
  PAGE_SIZE_OPTIONS,
  pageOfRole,
  pageOfRoles,
  parseRoleId,
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

const DEFAULTS: RolePermissionsLocation = {
  type: 'all',
  status: 'active',
  page: 1,
  pageSize: 10,
};

/** 24 active roles in the order of the list: 1 to 12 of Sistema, 13 to 24 of Clínica. */
const TWENTY_FOUR = Array.from({ length: 24 }, (_, index) => role(index + 1, index < 12 ? 1 : 2));

describe('page size options', () => {
  it('offers 10, 25 and 50, with 10 by default, as the list of users does (FR-004)', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});

describe('parseRolePermissionsSearchParams', () => {
  it('defaults to Todos, Activos, the first page and 10 per page (FR-004, FR-007)', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams())).toEqual(DEFAULTS);
  });

  it.each([
    ['type=sistema', 'system'],
    ['type=clinica', 'clinic'],
  ] as const)('reads %s, the same values the old tabs used (FR-019)', (search, type) => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).type).toBe(type);
  });

  it('reads status=bloqueados', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('status=bloqueados')).status).toBe(
      'blocked',
    );
  });

  it.each(['type=x', 'type=all', 'type=system', 'type=SISTEMA', 'type='])(
    'treats %j as Todos (FR-018)',
    (search) => {
      expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).type).toBe('all');
    },
  );

  it.each(['status=x', 'status=blocked', 'status=activos', 'status='])(
    'treats %j as Activos (FR-018)',
    (search) => {
      expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).status).toBe('active');
    },
  );

  it.each([
    ['page=2', 2],
    ['page=15', 15],
    ['page=999999999999999', 999999999999999],
  ])('reads %s as page %i', (search, page) => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).page).toBe(page);
  });

  it.each([
    'page=0',
    'page=007',
    'page=1.5',
    'page=abc',
    'page=-1',
    'page=',
    'page=1234567890123456',
  ])('treats %j as the first page: only ^[1-9]\\d{0,14}$ is a page (FR-018)', (search) => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).page).toBe(1);
  });

  it.each([10, 25, 50])('reads page_size=%i', (pageSize) => {
    expect(
      parseRolePermissionsSearchParams(new URLSearchParams(`page_size=${pageSize}`)).pageSize,
    ).toBe(pageSize);
  });

  it.each(['page_size=7', 'page_size=100', 'page_size=abc', 'page_size=010', 'page_size='])(
    'treats %j as 10 per page: only 10, 25 and 50 are accepted (FR-018)',
    (search) => {
      expect(parseRolePermissionsSearchParams(new URLSearchParams(search)).pageSize).toBe(10);
    },
  );

  it('does not read a role from the address: roleId is only an old link (D3)', () => {
    expect(parseRolePermissionsSearchParams(new URLSearchParams('roleId=6'))).toEqual(DEFAULTS);
  });
});

describe('toRolePermissionsSearchParams', () => {
  it('omits what is the default', () => {
    expect(toRolePermissionsSearchParams(DEFAULTS).toString()).toBe('');
  });

  it('writes type, status, page and page_size, in that order', () => {
    const params = toRolePermissionsSearchParams({
      type: 'clinic',
      status: 'blocked',
      page: 2,
      pageSize: 25,
    });

    expect(params.toString()).toBe('type=clinica&status=bloqueados&page=2&page_size=25');
  });

  it('leaves out the first page and the default page size on their own', () => {
    expect(
      toRolePermissionsSearchParams({ ...DEFAULTS, type: 'system', pageSize: 25 }).toString(),
    ).toBe('type=sistema&page_size=25');
    expect(toRolePermissionsSearchParams({ ...DEFAULTS, page: 3 }).toString()).toBe('page=3');
  });

  it.each([
    'type=sistema',
    'type=clinica&page=2',
    'status=bloqueados',
    'page_size=25',
    'type=sistema&status=bloqueados&page=3&page_size=50',
  ])('round-trips the canonical address %j unchanged', (search) => {
    const location = parseRolePermissionsSearchParams(new URLSearchParams(search));

    expect(toRolePermissionsSearchParams(location).toString()).toBe(search);
  });

  it('turns an address with invalid values into its normal form', () => {
    const location = parseRolePermissionsSearchParams(
      new URLSearchParams('type=xyz&status=borrados&page=0&page_size=7'),
    );

    expect(toRolePermissionsSearchParams(location).toString()).toBe('');
  });

  it('drops an old roleId from the normal form (FR-019)', () => {
    const location = parseRolePermissionsSearchParams(new URLSearchParams('type=sistema&roleId=5'));

    expect(toRolePermissionsSearchParams(location).toString()).toBe('type=sistema');
  });
});

describe('locationSearch', () => {
  it('is empty when everything is the default', () => {
    expect(locationSearch(DEFAULTS)).toBe('');
  });

  it('is the question mark and the normal form otherwise', () => {
    expect(locationSearch({ ...DEFAULTS, type: 'system', page: 2 })).toBe('?type=sistema&page=2');
    expect(locationSearch({ type: 'clinic', status: 'blocked', page: 1, pageSize: 50 })).toBe(
      '?type=clinica&status=bloqueados&page_size=50',
    );
  });
});

describe('legacyRoleIdOf (old links, FR-019)', () => {
  it.each([
    ['roleId=7', 7],
    ['type=clinica&status=bloqueados&roleId=8', 8],
    ['roleId=1234567890', 1234567890],
  ])('reads the role of %j', (search, id) => {
    expect(legacyRoleIdOf(new URLSearchParams(search))).toBe(id);
  });

  it.each([
    '',
    'type=sistema',
    'roleId=',
    'roleId=0',
    'roleId=007',
    'roleId=abc',
    'roleId=-1',
    'roleId=12345678901',
  ])('gives no role for %j: only ^[1-9]\\d{0,9}$ is an id', (search) => {
    expect(legacyRoleIdOf(new URLSearchParams(search))).toBeNull();
  });
});

describe('parseRoleId (the :roleId of /roles/:roleId)', () => {
  it.each([
    ['7', 7],
    ['1234567890', 1234567890],
  ])('reads %j as role %i', (value, id) => {
    expect(parseRoleId(value)).toBe(id);
  });

  it.each([undefined, '', '0', '007', 'abc', '-1', '1.5', '12345678901'])(
    'is not the id of a role: %j',
    (value) => {
      expect(parseRoleId(value)).toBeNull();
    },
  );
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

describe('lastPageOf', () => {
  it.each([
    [0, 10, 1],
    [1, 10, 1],
    [10, 10, 1],
    [11, 10, 2],
    [100, 25, 4],
    [101, 25, 5],
  ])('with %i roles at %i per page the last page is %i', (total, pageSize, last) => {
    expect(lastPageOf(total, pageSize)).toBe(last);
  });
});

describe('pageOfRoles', () => {
  const twelve = TWENTY_FOUR.slice(0, 12);

  it('cuts the rows of the page asked for', () => {
    expect(pageOfRoles(twelve, 1, 10).map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pageOfRoles(twelve, 2, 10).map(({ id }) => id)).toEqual([11, 12]);
  });

  it('shows every role when the page size is larger than the list', () => {
    expect(pageOfRoles(twelve, 1, 25)).toHaveLength(12);
  });

  it('gives no rows for a page after the last one', () => {
    expect(pageOfRoles(twelve, 3, 10)).toEqual([]);
  });
});

describe('pageOfRole', () => {
  const twelve = TWENTY_FOUR.slice(0, 12);

  it('is the page where the role is, counting from 1', () => {
    expect(pageOfRole(twelve, 1, 10)).toBe(1);
    expect(pageOfRole(twelve, 10, 10)).toBe(1);
    expect(pageOfRole(twelve, 11, 10)).toBe(2);
    expect(pageOfRole(twelve, 12, 25)).toBe(1);
  });

  it('is the first page when the role is not in the list', () => {
    expect(pageOfRole(twelve, 99, 10)).toBe(1);
    expect(pageOfRole([], 1, 10)).toBe(1);
  });
});

describe('locationAfterCreate (FR-017)', () => {
  // The last role of each type in `TWENTY_FOUR`: 12 of Sistema, then 12 of Clínica.
  const lastSystem = role(12, 1);
  const lastClinic = role(24, 2);

  it('keeps Todos, switches to Activos and shows the page where the new role is', () => {
    expect(
      locationAfterCreate(
        { type: 'all', status: 'blocked', page: 1, pageSize: 10 },
        lastClinic,
        TWENTY_FOUR,
      ),
    ).toEqual({ type: 'all', status: 'active', page: 3, pageSize: 10 });
  });

  it('keeps a type filter that already includes the new role, and counts the page in that type', () => {
    expect(
      locationAfterCreate(
        { type: 'clinic', status: 'active', page: 1, pageSize: 10 },
        lastClinic,
        TWENTY_FOUR,
      ),
    ).toEqual({ type: 'clinic', status: 'active', page: 2, pageSize: 10 });
  });

  it('switches the type filter only when it does not include the new role', () => {
    expect(
      locationAfterCreate(
        { type: 'clinic', status: 'blocked', page: 2, pageSize: 10 },
        lastSystem,
        TWENTY_FOUR,
      ),
    ).toEqual({ type: 'system', status: 'active', page: 2, pageSize: 10 });
  });

  it('keeps the page size', () => {
    expect(
      locationAfterCreate(
        { type: 'all', status: 'active', page: 1, pageSize: 25 },
        lastClinic,
        TWENTY_FOUR,
      ),
    ).toEqual({ type: 'all', status: 'active', page: 1, pageSize: 25 });
  });

  it('goes to the first page when the new role is not in the list that is known', () => {
    expect(
      locationAfterCreate(
        { type: 'all', status: 'active', page: 4, pageSize: 10 },
        lastClinic,
        TWENTY_FOUR.slice(0, 5),
      ),
    ).toEqual({ type: 'all', status: 'active', page: 1, pageSize: 10 });
  });
});

describe('emptyRolesMessage (data-model §3)', () => {
  const text = messages.roles.list;

  it.each([
    ['all', 'active', text.emptyAll],
    ['system', 'active', text.emptySistema],
    ['clinic', 'active', text.emptyClinica],
    ['all', 'blocked', text.emptyBlocked],
    ['system', 'blocked', text.emptyBlocked],
    ['clinic', 'blocked', text.emptyBlocked],
  ] as const)('with %s and %s says %j', (type, status, message) => {
    expect(emptyRolesMessage(type, status)).toBe(message);
  });
});
