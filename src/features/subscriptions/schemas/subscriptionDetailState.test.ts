import { describe, expect, it } from 'vitest';

import { parseSubscriptionDetailState } from './subscriptionDetailState';

describe('parseSubscriptionDetailState', () => {
  it.each(['?page=2&page_size=25', '?page=3', '?page_size=50', '?'])(
    'keeps the search of the list %j, to go back to the same page',
    (listSearch) => {
      expect(parseSubscriptionDetailState({ listSearch })).toEqual({ listSearch });
    },
  );

  it.each([
    ['without the question mark', 'page=3'],
    ['with the search of the users', '?email=a%40b.com'],
    ['with a parameter that the list does not write', '?page=2&x=1'],
    ['that could send the person somewhere else', '?next=https://evil.example'],
    ['that is too long', `?page=${'1'.repeat(300)}`],
  ])('drops a search %s', (_case, listSearch) => {
    expect(parseSubscriptionDetailState({ listSearch })).toEqual({});
  });

  it('drops a search that is not a text', () => {
    expect(parseSubscriptionDetailState({ listSearch: 3 })).toEqual({});
  });

  it.each([null, undefined, 7, 'texto', ['?page=2'], true])(
    'gives an empty state for %j, which is not an object',
    (state) => {
      expect(parseSubscriptionDetailState(state)).toEqual({});
    },
  );

  it('ignores what else the history entry carries', () => {
    expect(parseSubscriptionDetailState({ listSearch: '?page=2', other: 'x' })).toEqual({
      listSearch: '?page=2',
    });
  });
});
