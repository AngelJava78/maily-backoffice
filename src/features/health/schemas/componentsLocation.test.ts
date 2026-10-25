import { describe, expect, it } from 'vitest';

import { parseComponentsSearchParams, toComponentsSearchParams } from './componentsLocation';

function parse(search: string) {
  return parseComponentsSearchParams(new URLSearchParams(search));
}

describe('parseComponentsSearchParams', () => {
  it('starts at the first page of 10', () => {
    expect(parse('')).toEqual({ page: 1, pageSize: 10 });
  });

  it.each([
    ['page=3&pageSize=25', { page: 3, pageSize: 25 }],
    ['page=2&pageSize=50', { page: 2, pageSize: 50 }],
  ])('reads %s', (search, location) => {
    expect(parse(search)).toEqual(location);
  });

  it.each(['page=0', 'page=-1', 'page=1.5', 'page=dos', 'page=01', 'page='])(
    'goes to the first page with %s',
    (search) => {
      expect(parse(search).page).toBe(1);
    },
  );

  it.each(['pageSize=20', 'pageSize=100', 'pageSize=diez', 'pageSize='])(
    'uses 10 per page with %s',
    (search) => {
      expect(parse(search).pageSize).toBe(10);
    },
  );
});

describe('toComponentsSearchParams', () => {
  it('leaves the defaults out of the address', () => {
    expect(toComponentsSearchParams({ page: 1, pageSize: 10 }).toString()).toBe('');
  });

  it('writes the page and its size otherwise', () => {
    expect(toComponentsSearchParams({ page: 2, pageSize: 25 }).toString()).toBe(
      'page=2&pageSize=25',
    );
  });
});
