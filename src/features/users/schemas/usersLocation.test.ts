import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  emptyUsersMessage,
  PAGE_SIZE_OPTIONS,
  parseUserId,
  parseUsersSearchParams,
  ROLE_TYPE_ID_OF_USERS_FILTER,
  STATUS_ID_OF_USERS_FILTER,
  toUsersSearchParams,
  type UsersLocation,
  type UsersStatusFilter,
  type UsersTypeFilter,
} from './usersLocation';

function parse(search: string): UsersLocation {
  return parseUsersSearchParams(new URLSearchParams(search));
}

/** The first page of 10 with Todos and Activos, what `/users` opens. */
const DEFAULT_LIST = {
  mode: 'list',
  page: 1,
  pageSize: 10,
  type: 'all',
  status: 'active',
} as const satisfies UsersLocation;

describe('constants', () => {
  it('offers 10, 25 and 50 users per page, 10 by default (FR-001)', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 25, 50]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });

  it('asks the users service for type 1 (Sistema) or 2 (Clínica), and status 1 or 2', () => {
    expect(ROLE_TYPE_ID_OF_USERS_FILTER).toEqual({ system: 1, clinic: 2 });
    expect(STATUS_ID_OF_USERS_FILTER).toEqual({ active: 1, blocked: 2 });
  });
});

describe('parseUsersSearchParams', () => {
  it('lists the first page of 10 with Todos and Activos when the address has no parameters (FR-004)', () => {
    expect(parse('')).toEqual(DEFAULT_LIST);
  });

  it('reads the page and the page size', () => {
    expect(parse('?page=2&page_size=25')).toEqual({ ...DEFAULT_LIST, page: 2, pageSize: 25 });
    expect(parse('page_size=50')).toEqual({ ...DEFAULT_LIST, pageSize: 50 });
  });

  it('reads a link saved before the filters as Todos and Activos (FR-010)', () => {
    expect(parse('?page=3&page_size=25')).toEqual({ ...DEFAULT_LIST, page: 3, pageSize: 25 });
  });

  it.each(['abc', '0', '-2', '2.5', '1e1', '0x10', '', ' ', '9'.repeat(30)])(
    'replaces the page "%s" with 1',
    (page) => {
      expect(parse(`page=${encodeURIComponent(page)}`)).toMatchObject({ mode: 'list', page: 1 });
    },
  );

  it.each(['7', '100', '0', 'abc', '', '10.5'])(
    'replaces the page size "%s", which is not one of the options, with 10',
    (pageSize) => {
      expect(parse(`page_size=${pageSize}`)).toMatchObject({ mode: 'list', pageSize: 10 });
    },
  );

  it.each<[string, UsersTypeFilter]>([
    ['1', 'system'],
    ['2', 'clinic'],
  ])('reads type_id=%s as the type filter %s', (typeId, type) => {
    expect(parse(`type_id=${typeId}`)).toEqual({ ...DEFAULT_LIST, type });
  });

  it.each(['0', '3', '-1', 'abc', '', '01', '1.0', 'sistema'])(
    'replaces type_id "%s", which is not a type, with Todos (FR-009)',
    (typeId) => {
      expect(parse(`type_id=${typeId}`)).toMatchObject({ type: 'all' });
    },
  );

  it('reads status_id=2 as Bloqueados', () => {
    expect(parse('status_id=2')).toEqual({ ...DEFAULT_LIST, status: 'blocked' });
  });

  it.each(['1', '3', '0', 'abc', '', '02', 'bloqueados'])(
    'reads status_id "%s" as Activos: deleted users are never listed (FR-009)',
    (statusId) => {
      expect(parse(`status_id=${statusId}`)).toMatchObject({ status: 'active' });
    },
  );

  it('reads both filters together with the page and the page size', () => {
    expect(parse('?type_id=2&status_id=2&page=4&page_size=50')).toEqual({
      mode: 'list',
      page: 4,
      pageSize: 50,
      type: 'clinic',
      status: 'blocked',
    });
  });

  it('searches by email, trimmed, ignores the page and the page size and keeps the filters (FR-011)', () => {
    expect(
      parse('?email=%20ana%40clinica.com%20&page=3&page_size=25&type_id=1&status_id=2'),
    ).toEqual({ mode: 'search', email: 'ana@clinica.com', type: 'system', status: 'blocked' });
    expect(parse('?email=ana%40clinica.com')).toEqual({
      mode: 'search',
      email: 'ana@clinica.com',
      type: 'all',
      status: 'active',
    });
  });

  it.each(['email=', 'email=%20%20', 'email=%09'])(
    'does not take "%s", an empty email, for a search (FR-018)',
    (search) => {
      expect(parse(`${search}&page=2`)).toEqual({ ...DEFAULT_LIST, page: 2 });
    },
  );
});

describe('toUsersSearchParams', () => {
  it('omits what is the default', () => {
    expect(toUsersSearchParams(DEFAULT_LIST).toString()).toBe('');
  });

  it('writes the page and the page size that are not the default', () => {
    const params = toUsersSearchParams({ ...DEFAULT_LIST, page: 3, pageSize: 25 });

    expect(params.get('page')).toBe('3');
    expect(params.get('page_size')).toBe('25');
    expect(toUsersSearchParams({ ...DEFAULT_LIST, pageSize: 50 }).toString()).toBe('page_size=50');
  });

  it('keeps a link saved before the filters as it was (FR-010)', () => {
    expect(toUsersSearchParams(parse('page=3&page_size=25')).toString()).toBe(
      'page=3&page_size=25',
    );
  });

  it('writes the filters first, in a fixed order, and leaves out Todos and Activos', () => {
    expect(
      toUsersSearchParams({
        mode: 'list',
        page: 2,
        pageSize: 25,
        type: 'clinic',
        status: 'blocked',
      }).toString(),
    ).toBe('type_id=2&status_id=2&page=2&page_size=25');
    expect(toUsersSearchParams({ ...DEFAULT_LIST, type: 'system' }).toString()).toBe('type_id=1');
    expect(toUsersSearchParams({ ...DEFAULT_LIST, status: 'blocked' }).toString()).toBe(
      'status_id=2',
    );
  });

  it('writes the email and the filters in a search, but not the page', () => {
    expect(
      toUsersSearchParams({
        mode: 'search',
        email: 'ana@clinica.com',
        type: 'all',
        status: 'active',
      }).toString(),
    ).toBe('email=ana%40clinica.com');
    expect(
      toUsersSearchParams({
        mode: 'search',
        email: 'ana@clinica.com',
        type: 'clinic',
        status: 'blocked',
      }).toString(),
    ).toBe('email=ana%40clinica.com&type_id=2&status_id=2');
  });

  it.each<UsersLocation>([
    DEFAULT_LIST,
    { ...DEFAULT_LIST, page: 7 },
    { ...DEFAULT_LIST, pageSize: 25 },
    { ...DEFAULT_LIST, page: 12, pageSize: 50 },
    { ...DEFAULT_LIST, type: 'system' },
    { ...DEFAULT_LIST, type: 'clinic', status: 'blocked', page: 3 },
    { mode: 'search', email: 'ana@clinica.com', type: 'all', status: 'active' },
    { mode: 'search', email: 'qa+002-1@dominio.mx', type: 'system', status: 'blocked' },
  ])('is the inverse of parsing for %j', (location) => {
    expect(parseUsersSearchParams(toUsersSearchParams(location))).toEqual(location);
  });
});

describe('emptyUsersMessage', () => {
  it.each<[UsersTypeFilter, UsersStatusFilter, string]>([
    ['all', 'active', 'No hay usuarios activos'],
    ['system', 'active', 'No hay usuarios activos de Sistema'],
    ['clinic', 'active', 'No hay usuarios activos de Clínica'],
    ['all', 'blocked', 'No hay usuarios bloqueados'],
    ['system', 'blocked', 'No hay usuarios bloqueados de Sistema'],
    ['clinic', 'blocked', 'No hay usuarios bloqueados de Clínica'],
  ])('says, for %s and %s, «%s» (FR-013)', (type, status, message) => {
    expect(emptyUsersMessage(type, status)).toBe(message);
  });
});

describe('parseUserId', () => {
  const ID = '3f2b8c1e-7d4a-4e5b-9a60-1c2d3e4f5a6b';

  it('reads a UUID written as 8-4-4-4-12 hexadecimal digits', () => {
    expect(parseUserId(ID)).toBe(ID);
  });

  it('answers in lower case, as the users service returns the id', () => {
    expect(parseUserId(ID.toUpperCase())).toBe(ID);
  });

  it.each([
    undefined,
    '',
    'abc',
    '121',
    '0',
    '-1',
    ' ' + ID,
    ID + ' ',
    ID.replaceAll('-', ''),
    `{${ID}}`,
    `urn:uuid:${ID}`,
    ID.slice(0, -1),
    ID.replace('3f2b', 'zzzz'),
  ])('is null for %j, which is not the id of a user', (value) => {
    expect(parseUserId(value)).toBeNull();
  });
});
