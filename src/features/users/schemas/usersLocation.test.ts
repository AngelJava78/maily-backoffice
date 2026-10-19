import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  parseUserId,
  parseUsersSearchParams,
  toUsersSearchParams,
  type UsersLocation,
} from './usersLocation';

function parse(search: string): UsersLocation {
  return parseUsersSearchParams(new URLSearchParams(search));
}

describe('constants', () => {
  it('offers 10, 25 and 50 users per page, 10 by default (FR-001)', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 25, 50]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});

describe('parseUsersSearchParams', () => {
  it('lists the first page of 10 when the address has no parameters', () => {
    expect(parse('')).toEqual({ mode: 'list', page: 1, pageSize: 10 });
  });

  it('reads the page and the page size', () => {
    expect(parse('?page=2&page_size=25')).toEqual({ mode: 'list', page: 2, pageSize: 25 });
    expect(parse('page_size=50')).toEqual({ mode: 'list', page: 1, pageSize: 50 });
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

  it('searches by email, trimmed, and then ignores the page and the page size', () => {
    expect(parse('?email=%20ana%40clinica.com%20&page=3&page_size=25')).toEqual({
      mode: 'search',
      email: 'ana@clinica.com',
    });
  });

  it.each(['email=', 'email=%20%20', 'email=%09'])(
    'does not take "%s", an empty email, for a search (FR-018)',
    (search) => {
      expect(parse(`${search}&page=2`)).toEqual({ mode: 'list', page: 2, pageSize: 10 });
    },
  );
});

describe('toUsersSearchParams', () => {
  it('omits what is the default', () => {
    expect(toUsersSearchParams({ mode: 'list', page: 1, pageSize: 10 }).toString()).toBe('');
  });

  it('writes the page and the page size that are not the default', () => {
    const params = toUsersSearchParams({ mode: 'list', page: 3, pageSize: 25 });

    expect(params.get('page')).toBe('3');
    expect(params.get('page_size')).toBe('25');
    expect(toUsersSearchParams({ mode: 'list', page: 1, pageSize: 50 }).toString()).toBe(
      'page_size=50',
    );
  });

  it('writes only the email in a search', () => {
    expect(toUsersSearchParams({ mode: 'search', email: 'ana@clinica.com' }).toString()).toBe(
      'email=ana%40clinica.com',
    );
  });

  it.each<UsersLocation>([
    { mode: 'list', page: 1, pageSize: 10 },
    { mode: 'list', page: 7, pageSize: 10 },
    { mode: 'list', page: 1, pageSize: 25 },
    { mode: 'list', page: 12, pageSize: 50 },
    { mode: 'search', email: 'ana@clinica.com' },
    { mode: 'search', email: 'qa+002-1@dominio.mx' },
  ])('is the inverse of parsing for %j', (location) => {
    expect(parseUsersSearchParams(toUsersSearchParams(location))).toEqual(location);
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
