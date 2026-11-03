import { partialMatchKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { roleKeys, userKeys } from './userKeys';
import { uuidOf } from '@/test/ids';

/** The list that `/users` opens: first page of 10, Todos and Activos. */
const FIRST_PAGE = { page: 1, pageSize: 10, type: 'all', status: 'active' } as const;

describe('userKeys', () => {
  it('keys a list by its page, its size and both filters', () => {
    expect(userKeys.list({ ...FIRST_PAGE, page: 2, pageSize: 25 })).toEqual([
      'users',
      'list',
      { page: 2, pageSize: 25, type: 'all', status: 'active' },
    ]);
  });

  it('keys each combination of filters apart, since the service answers each one differently', () => {
    const keys = [
      userKeys.list(FIRST_PAGE),
      userKeys.list({ ...FIRST_PAGE, type: 'system' }),
      userKeys.list({ ...FIRST_PAGE, status: 'blocked' }),
      userKeys.list({ ...FIRST_PAGE, type: 'clinic', status: 'blocked' }),
    ];

    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(4);
    for (const key of keys) {
      expect(partialMatchKey(key, userKeys.lists())).toBe(true);
    }
  });

  it('keys a search by the email, trimmed and in lower case, so spelling variants share it', () => {
    expect(userKeys.search(' ANA@Clinica.com ')).toEqual(['users', 'search', 'ana@clinica.com']);
    expect(userKeys.search('ana@clinica.com')).toEqual(userKeys.search('  Ana@CLINICA.com'));
  });

  it('keys the detail of a user, and its roles under it', () => {
    expect(userKeys.detail(uuidOf(121))).toEqual(['users', 'detail', uuidOf(121)]);
    expect(userKeys.roles(uuidOf(121))).toEqual(['users', 'detail', uuidOf(121), 'roles']);
  });

  it('keys the catalog of roles apart from the users', () => {
    expect(roleKeys.catalog()).toEqual(['roles', 'catalog']);
  });

  describe('as prefixes, which is how a mutation invalidates (constitution III)', () => {
    it('lets every list be reached through `lists`, and nothing else', () => {
      expect(partialMatchKey(userKeys.list({ ...FIRST_PAGE, page: 3 }), userKeys.lists())).toBe(
        true,
      );
      expect(partialMatchKey(userKeys.search('ana@clinica.com'), userKeys.lists())).toBe(false);
      expect(partialMatchKey(userKeys.detail(uuidOf(121)), userKeys.lists())).toBe(false);
    });

    it('lets every search be reached through `searches`', () => {
      expect(partialMatchKey(userKeys.search('ana@clinica.com'), userKeys.searches())).toBe(true);
      expect(partialMatchKey(userKeys.list(FIRST_PAGE), userKeys.searches())).toBe(false);
    });

    it('hangs the roles of a user from its detail, but not the ones of another user', () => {
      expect(partialMatchKey(userKeys.roles(uuidOf(121)), userKeys.detail(uuidOf(121)))).toBe(true);
      expect(partialMatchKey(userKeys.roles(uuidOf(122)), userKeys.detail(uuidOf(121)))).toBe(
        false,
      );
    });

    it('keeps the roles apart from the users', () => {
      expect(partialMatchKey(roleKeys.catalog(), userKeys.all)).toBe(false);
    });
  });
});
