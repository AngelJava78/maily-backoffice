import { describe, expect, it } from 'vitest';

import { SUBSCRIPTION_TYPE } from './subscriptionTypeCatalog';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  PAGE_SIZE_OPTIONS,
  parseSubscriptionId,
  parseSubscriptionsSearchParams,
  toSubscriptionsSearchParams,
  type SubscriptionsSortField,
} from './subscriptionsLocation';

const parse = (search: string) => parseSubscriptionsSearchParams(new URLSearchParams(search));

describe('parseSubscriptionsSearchParams', () => {
  it('reads the page and the page size of the address', () => {
    expect(parse('page=2&page_size=25')).toEqual({
      page: 2,
      pageSize: 25,
      tab: 'list',
      sort: DEFAULT_SORT,
      comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
    });
  });

  it('starts at the first page with 10 rows, in the Listado tab, sorted by monthly price ascending and filtered to Individual, when the address says nothing', () => {
    expect(parse('')).toEqual({
      page: 1,
      pageSize: 10,
      tab: 'list',
      sort: DEFAULT_SORT,
      comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
    });
  });

  it('reads the Comparativo tab', () => {
    expect(parse('tab=comparison').tab).toBe('comparison');
  });

  it.each(['list', 'x', '', 'comparative'])('takes tab %j as the Listado tab', (tab) => {
    expect(parse(`tab=${tab}`).tab).toBe('list');
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
    expect(parse('page=3&email=a%40b.com&foo=bar')).toEqual({
      page: 3,
      pageSize: 10,
      tab: 'list',
      sort: DEFAULT_SORT,
      comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
    });
  });
});

describe('the sort of the list (020)', () => {
  it('is monthly price ascending when the address says nothing, or says something invalid', () => {
    expect(parse('').sort).toEqual({ field: 'monthlyPrice', direction: 'asc' });
    expect(parse('sort=').sort).toEqual(DEFAULT_SORT);
    expect(parse('sort=unknownField').sort).toEqual(DEFAULT_SORT);
    expect(parse('sort=-unknownField').sort).toEqual(DEFAULT_SORT);
  });

  it('reads a field name as that field, ascending', () => {
    expect(parse('sort=name').sort).toEqual({ field: 'name', direction: 'asc' });
  });

  it('reads a field name with a leading "-" as that field, descending', () => {
    expect(parse('sort=-name').sort).toEqual({ field: 'name', direction: 'desc' });
  });

  it.each<SubscriptionsSortField>([
    'name',
    'subscriptionType',
    'clinicsCount',
    'consultingRoomsLimit',
    'monthlyPrice',
    'annualPrice',
    'status',
  ])('accepts %s as a sortable field', (field) => {
    expect(parse(`sort=${field}`).sort).toEqual({ field, direction: 'asc' });
  });

  it('writes a non-default sort to the address, and leaves the default one out', () => {
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'list',
        sort: DEFAULT_SORT,
        comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
      }).toString(),
    ).toBe('');
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'list',
        sort: { field: 'status', direction: 'asc' },
        comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
      }).toString(),
    ).toBe('sort=status');
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'list',
        sort: { field: 'status', direction: 'desc' },
        comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
      }).toString(),
    ).toBe('sort=-status');
  });
});

describe('the type filter of the Comparativo (020)', () => {
  it('is Individual when the address says nothing, or says anything other than "2"', () => {
    expect(parse('').comparisonType).toBe(SUBSCRIPTION_TYPE.INDIVIDUAL);
    expect(parse('type_id=').comparisonType).toBe(SUBSCRIPTION_TYPE.INDIVIDUAL);
    expect(parse('type_id=abc').comparisonType).toBe(SUBSCRIPTION_TYPE.INDIVIDUAL);
    expect(parse('type_id=1').comparisonType).toBe(SUBSCRIPTION_TYPE.INDIVIDUAL);
  });

  it('is Enterprise when the address says type_id=2', () => {
    expect(parse('type_id=2').comparisonType).toBe(SUBSCRIPTION_TYPE.ENTERPRISE);
  });

  it('writes type_id=2 to the address for Enterprise, and leaves Individual (the default) out', () => {
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'comparison',
        sort: DEFAULT_SORT,
        comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
      }).toString(),
    ).toBe('tab=comparison');
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'comparison',
        sort: DEFAULT_SORT,
        comparisonType: SUBSCRIPTION_TYPE.ENTERPRISE,
      }).toString(),
    ).toBe('tab=comparison&type_id=2');
  });
});

const DEFAULT_LOCATION_FIELDS = {
  sort: DEFAULT_SORT,
  comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
} as const;

describe('toSubscriptionsSearchParams', () => {
  it('leaves the default values out of the address', () => {
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'list',
        ...DEFAULT_LOCATION_FIELDS,
      }).toString(),
    ).toBe('');
    expect(
      toSubscriptionsSearchParams({
        page: 3,
        pageSize: 10,
        tab: 'list',
        ...DEFAULT_LOCATION_FIELDS,
      }).toString(),
    ).toBe('page=3');
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 50,
        tab: 'list',
        ...DEFAULT_LOCATION_FIELDS,
      }).toString(),
    ).toBe('page_size=50');
    expect(
      toSubscriptionsSearchParams({
        page: 1,
        pageSize: 10,
        tab: 'comparison',
        ...DEFAULT_LOCATION_FIELDS,
      }).toString(),
    ).toBe('tab=comparison');
  });

  it.each([
    { page: 1, pageSize: 10, tab: 'list', ...DEFAULT_LOCATION_FIELDS },
    { page: 2, pageSize: 25, tab: 'list', ...DEFAULT_LOCATION_FIELDS },
    { page: 7, pageSize: 50, tab: 'comparison', ...DEFAULT_LOCATION_FIELDS },
    {
      page: 1,
      pageSize: 10,
      tab: 'comparison',
      sort: DEFAULT_SORT,
      comparisonType: SUBSCRIPTION_TYPE.ENTERPRISE,
    },
    {
      page: 2,
      pageSize: 25,
      tab: 'list',
      sort: { field: 'name', direction: 'desc' },
      comparisonType: SUBSCRIPTION_TYPE.INDIVIDUAL,
    },
  ] as const)(
    'is the inverse of the parser for $page, $pageSize, $tab, $sort and $comparisonType',
    (location) => {
      expect(parseSubscriptionsSearchParams(toSubscriptionsSearchParams(location))).toEqual(
        location,
      );
    },
  );
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
