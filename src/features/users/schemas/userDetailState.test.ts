import { describe, expect, it } from 'vitest';

import { parseUserDetailState } from './userDetailState';

describe('parseUserDetailState', () => {
  it('keeps the search of the list that the person comes from', () => {
    expect(parseUserDetailState({ listSearch: '?page=3&page_size=25' })).toEqual({
      listSearch: '?page=3&page_size=25',
    });
    expect(parseUserDetailState({ listSearch: '?email=ana%40clinica.com' })).toEqual({
      listSearch: '?email=ana%40clinica.com',
    });
  });

  it.each([
    ['without the question mark', 'page=3'],
    ['with a parameter that is not of the list', '?page=3&x=1'],
    ['that sends the person elsewhere', '?next=https://evil.example'],
    ['that is too long', `?email=${'a'.repeat(300)}`],
    ['that is not a text', 3],
  ])('discards a search %s', (_label, listSearch) => {
    expect(parseUserDetailState({ listSearch })).toEqual({});
  });

  it('keeps the roles that could not be assigned after creating a user', () => {
    const rolesNotAssigned = [
      { id: 4, name: 'Marketing' },
      { id: 9, name: 'Doctor' },
    ];

    expect(parseUserDetailState({ rolesNotAssigned })).toEqual({ rolesNotAssigned });
  });

  it.each([
    ['a role with an id below 1', [{ id: 0, name: 'Doctor' }]],
    ['a role with an empty name', [{ id: 9, name: '' }]],
    ['a role with a name of more than 50 characters', [{ id: 9, name: 'N'.repeat(51) }]],
    ['a role without name', [{ id: 9 }]],
    ['more than 100 roles', Array.from({ length: 101 }, (_, i) => ({ id: i + 1, name: 'R' }))],
    ['something that is not a list', { id: 9, name: 'Doctor' }],
  ])('discards the whole list when it has %s', (_label, rolesNotAssigned) => {
    expect(parseUserDetailState({ rolesNotAssigned })).toEqual({});
  });

  it('keeps one part when the other is not valid', () => {
    expect(
      parseUserDetailState({ listSearch: '?page=2', rolesNotAssigned: [{ id: 0, name: 'x' }] }),
    ).toEqual({ listSearch: '?page=2' });
  });

  it.each([null, undefined, 3, 'text', [], [{ listSearch: '?page=2' }], true])(
    'gives an empty state for %j, which is not an object, without throwing',
    (state) => {
      expect(parseUserDetailState(state)).toEqual({});
    },
  );

  it('ignores whatever else the history entry carries', () => {
    expect(parseUserDetailState({ listSearch: '?page=2', other: 'value' })).toEqual({
      listSearch: '?page=2',
    });
  });
});
