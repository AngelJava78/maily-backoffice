import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  parseSubscriptionId,
  parseSubscriptionsSearchParams,
  toSubscriptionsSearchParams,
} from './subscriptionsLocation';

const parse = (search: string) => parseSubscriptionsSearchParams(new URLSearchParams(search));

describe('parseSubscriptionsSearchParams', () => {
  it('reads the page and the page size of the address', () => {
    expect(parse('page=2&page_size=25')).toEqual({ page: 2, pageSize: 25 });
  });

  it('starts at the first page with 10 rows when the address says nothing', () => {
    expect(parse('')).toEqual({ page: 1, pageSize: 10 });
  });

  it.each(['abc', '0', '-2', '2.5', '', '1e2'])(
    'takes the page %j, which is not a whole number from 1, as the first one',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1);
    },
  );

  it.each(['10', '25', '50'])('accepts %s rows per page', (pageSize) => {
    expect(parse(`page_size=${pageSize}`).pageSize).toBe(Number(pageSize));
  });

  it.each(['7', '100', 'abc', '0'])(
    'takes %j rows per page, which is not offered, as 10',
    (size) => {
      expect(parse(`page_size=${size}`).pageSize).toBe(10);
    },
  );

  it('ignores the other parameters', () => {
    expect(parse('page=3&email=a%40b.com&sort=name')).toEqual({ page: 3, pageSize: 10 });
  });
});

describe('toSubscriptionsSearchParams', () => {
  it('leaves the default values out of the address', () => {
    expect(toSubscriptionsSearchParams({ page: 1, pageSize: 10 }).toString()).toBe('');
    expect(toSubscriptionsSearchParams({ page: 3, pageSize: 10 }).toString()).toBe('page=3');
    expect(toSubscriptionsSearchParams({ page: 1, pageSize: 50 }).toString()).toBe('page_size=50');
  });

  it.each([
    { page: 1, pageSize: 10 },
    { page: 2, pageSize: 25 },
    { page: 7, pageSize: 50 },
  ] as const)('is the inverse of the parser for $page and $pageSize', (location) => {
    expect(parseSubscriptionsSearchParams(toSubscriptionsSearchParams(location))).toEqual(location);
  });
});

describe('the page sizes', () => {
  it('offers 10, 25 and 50 rows, with 10 by default', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50]);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});

describe('parseSubscriptionId', () => {
  it.each([
    ['7', 7],
    ['1', 1],
    ['2147483647', 2_147_483_647],
  ])('reads the id %j', (value, id) => {
    expect(parseSubscriptionId(value)).toBe(id);
  });

  it.each([undefined, '', 'abc', '0', '007', '-1', '1.5', '12abc', '2147483648', ' 7', '1e3'])(
    'gives null for %j, which is not an id',
    (value) => {
      expect(parseSubscriptionId(value)).toBeNull();
    },
  );
});
