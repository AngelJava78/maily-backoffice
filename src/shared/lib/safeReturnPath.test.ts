import { describe, expect, it } from 'vitest';

import { sanitizeReturnPathForStorage, toSafeInternalPath } from './safeReturnPath';
import { uuidOf } from '@/test/ids';

describe('toSafeInternalPath', () => {
  it.each(['/', '/profile', '/users?page=2', `/users/${uuidOf(12)}#details`, '/a/b/c?x=1&y=2'])(
    'accepts the internal path %s',
    (path) => {
      expect(toSafeInternalPath(path)).toBe(path);
    },
  );

  it.each([
    undefined,
    null,
    42,
    true,
    {},
    ['/profile'],
    '',
    'profile',
    ' /profile',
    'https://evil.com',
    'http://evil.com/profile',
    '//evil.com',
    '//evil.com/profile',
    '/\\evil.com',
    '\\evil.com',
    '\\\\evil.com',
    '/profile\\..\\x',
    'javascript:alert(1)',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '/profile\u0000',
    `/${'a'.repeat(3000)}`,
  ])('falls back to / for %j', (value) => {
    expect(toSafeInternalPath(value)).toBe('/');
  });
});

describe('sanitizeReturnPathForStorage', () => {
  it('keeps the pathname and the pagination and sort parameters', () => {
    expect(
      sanitizeReturnPathForStorage({
        pathname: '/users',
        search: '?page=2&page_size=20&sort=-created_at',
      }),
    ).toBe('/users?page=2&page_size=20&sort=-created_at');
  });

  it('keeps the order in which the allowed parameters came', () => {
    expect(sanitizeReturnPathForStorage({ pathname: '/users', search: '?sort=name&page=3' })).toBe(
      '/users?sort=name&page=3',
    );
  });

  it('drops every other parameter, free text above all', () => {
    expect(
      sanitizeReturnPathForStorage({
        pathname: '/users',
        search: '?q=maria%20lopez&email=ana%40clinica.com&page=2&token=abc',
      }),
    ).toBe('/users?page=2');
    expect(sanitizeReturnPathForStorage({ pathname: '/users', search: '?q=maria' })).toBe('/users');
  });

  it('keeps only the first value of a repeated parameter', () => {
    expect(sanitizeReturnPathForStorage({ pathname: '/users', search: '?page=1&page=9' })).toBe(
      '/users?page=1',
    );
  });

  it.each(['0', '-1', '1.5', 'abc', '', '01', '1e3', '99999999999999999999'])(
    'drops page=%j and page_size=%j when they are not positive integers',
    (value) => {
      expect(
        sanitizeReturnPathForStorage({
          pathname: '/users',
          search: `?page=${value}&page_size=${value}`,
        }),
      ).toBe('/users');
    },
  );

  it.each(['name desc', '<script>', 'a'.repeat(65), 'sort;drop', 'a/b', ''])(
    'drops sort=%j when it is not a short identifier',
    (value) => {
      expect(sanitizeReturnPathForStorage({ pathname: '/users', search: `?sort=${value}` })).toBe(
        '/users',
      );
    },
  );

  it('accepts a sort of exactly 64 allowed characters', () => {
    const sort = `${'a'.repeat(30)}.-_${'B'.repeat(31)}`;

    expect(sort).toHaveLength(64);
    expect(sanitizeReturnPathForStorage({ pathname: '/users', search: `?sort=${sort}` })).toBe(
      `/users?sort=${sort}`,
    );
  });

  it('works without a search string', () => {
    expect(sanitizeReturnPathForStorage({ pathname: '/profile' })).toBe('/profile');
    expect(sanitizeReturnPathForStorage({ pathname: '/profile', search: '' })).toBe('/profile');
    expect(sanitizeReturnPathForStorage({ pathname: '/profile', search: '?' })).toBe('/profile');
  });

  it.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', '', 'profile'])(
    'falls back to / for the unsafe pathname %j',
    (pathname) => {
      expect(sanitizeReturnPathForStorage({ pathname, search: '?page=2' })).toBe('/');
    },
  );

  it.each([null, undefined, 42, {}, ['/users']])(
    'falls back to / when the pathname is %j',
    (pathname) => {
      expect(sanitizeReturnPathForStorage({ pathname, search: '' })).toBe('/');
    },
  );

  it.each([null, 42, {}, ['?page=2']])('falls back to / when the search is %j', (search) => {
    expect(sanitizeReturnPathForStorage({ pathname: '/users', search })).toBe('/');
  });
});
