import { describe, expect, it } from 'vitest';

import { parseRoleDetailState } from './roleDetailState';

describe('parseRoleDetailState (research D6)', () => {
  it.each(['?type=sistema&page=2', '?status=bloqueados&page_size=25', '?type=clinica'])(
    'accepts the search of the table %j',
    (listSearch) => {
      expect(parseRoleDetailState({ listSearch })).toEqual({ listSearch });
    },
  );

  it.each([
    ['one that does not start with a question mark', 'type=sistema'],
    ['one with a parameter the table does not write', '?foo=1'],
    ['one with a parameter the table does not write, next to others', '?type=sistema&x=1'],
    ['one with the old roleId', '?type=sistema&roleId=5'],
    ['one that is empty', ''],
    ['one longer than 300 characters', `?type=${'a'.repeat(300)}`],
  ])('drops %s', (_description, listSearch) => {
    expect(parseRoleDetailState({ listSearch }).listSearch).toBeUndefined();
  });

  it.each([123, null, true, { type: 'sistema' }, ['?type=sistema']])(
    'drops a listSearch that is not text: %j',
    (listSearch) => {
      expect(parseRoleDetailState({ listSearch }).listSearch).toBeUndefined();
    },
  );

  it('accepts a search of exactly 300 characters', () => {
    const listSearch = `?type=${'a'.repeat(294)}`;
    expect(listSearch).toHaveLength(300);

    // The key is `type`, which is one of the table's, so only the length decides.
    expect(parseRoleDetailState({ listSearch }).listSearch).toBe(listSearch);
  });

  it('keeps no other key of the state', () => {
    expect(parseRoleDetailState({ listSearch: '?type=sistema', other: 1 })).toEqual({
      listSearch: '?type=sistema',
    });
  });

  it.each([null, undefined, 'x', 7, [], true])(
    'gives an empty state for something that is not an object: %j',
    (state) => {
      expect(parseRoleDetailState(state)).toEqual({});
    },
  );

  it('never throws', () => {
    expect(() => parseRoleDetailState(Symbol('state'))).not.toThrow();
  });
});
