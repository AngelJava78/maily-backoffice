import { z } from 'zod';

import { MAX_SUBSCRIPTION_ID } from './subscription';
import { SUBSCRIPTION_TYPE, type SubscriptionTypeId } from './subscriptionTypeCatalog';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** The two tabs of the section (research D6, D8): Listado is the default. */
export const SUBSCRIPTIONS_TABS = ['list', 'comparison'] as const;
export const DEFAULT_SUBSCRIPTIONS_TAB = 'list';

export type SubscriptionsTab = (typeof SUBSCRIPTIONS_TABS)[number];

/** The seven columns of the Listado (020, FR-004/FR-006), all of them sortable. */
export const SUBSCRIPTIONS_SORT_FIELDS = [
  'name',
  'subscriptionType',
  'clinicsCount',
  'consultingRoomsLimit',
  'monthlyPrice',
  'annualPrice',
  'status',
] as const;

export type SubscriptionsSortField = (typeof SUBSCRIPTIONS_SORT_FIELDS)[number];

const sortFieldSchema = z.literal(SUBSCRIPTIONS_SORT_FIELDS);

/** Whether `value` is one of the seven sortable columns, without a type assertion. */
export function isSubscriptionsSortField(value: string): value is SubscriptionsSortField {
  return sortFieldSchema.safeParse(value).success;
}

export interface SubscriptionsSort {
  readonly field: SubscriptionsSortField;
  readonly direction: 'asc' | 'desc';
}

/** The order of the Listado when the address says nothing (020, FR-006). */
export const DEFAULT_SORT: SubscriptionsSort = { field: 'monthlyPrice', direction: 'asc' };

/** The type filter of the Comparativo when the address says nothing (020, FR-007). */
export const DEFAULT_COMPARISON_TYPE: SubscriptionTypeId = SUBSCRIPTION_TYPE.INDIVIDUAL;

/**
 * What the address of the list asks for (constitution III: the state that can be navigated lives in
 * the URL): the page, its size, the active tab, the order of the Listado (020) and the type filter
 * of the Comparativo (020). There is no search.
 */
export interface SubscriptionsLocation {
  readonly page: number;
  readonly pageSize: PageSize;
  readonly tab: SubscriptionsTab;
  readonly sort: SubscriptionsSort;
  readonly comparisonType: SubscriptionTypeId;
}

/** A positive whole number written with digits only; nothing else is read as a number. */
const positiveIntegerText = z
  .string()
  .regex(/^[1-9]\d{0,14}$/)
  .transform(Number);

// An invalid value is replaced by the default one: an address that someone edited by hand still opens.
const pageSchema = positiveIntegerText.catch(1);
const pageSizeSchema = positiveIntegerText
  .pipe(z.literal(PAGE_SIZE_OPTIONS))
  .catch(DEFAULT_PAGE_SIZE);
const tabSchema = z.literal(SUBSCRIPTIONS_TABS).catch(DEFAULT_SUBSCRIPTIONS_TAB);
// Digits without leading zeros, up to the largest id of the API: "007" is not the address of 7.
const subscriptionIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number)
  .pipe(z.number().max(MAX_SUBSCRIPTION_ID));

/** `sort`: a field name, ascending; or that same name with a leading "-", descending. */
function parseSort(raw: string | null): SubscriptionsSort {
  if (raw === null) {
    return DEFAULT_SORT;
  }
  const direction = raw.startsWith('-') ? 'desc' : 'asc';
  const field = raw.startsWith('-') ? raw.slice(1) : raw;
  return isSubscriptionsSortField(field) ? { field, direction } : DEFAULT_SORT;
}

function serializeSort(sort: SubscriptionsSort): string | null {
  if (sort.field === DEFAULT_SORT.field && sort.direction === DEFAULT_SORT.direction) {
    return null;
  }
  return sort.direction === 'desc' ? `-${sort.field}` : sort.field;
}

/** The state of the list written in `search`; the page of the URL starts at 1. Never throws. */
export function parseSubscriptionsSearchParams(params: URLSearchParams): SubscriptionsLocation {
  return {
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('page_size') ?? undefined),
    tab: tabSchema.parse(params.get('tab') ?? undefined),
    sort: parseSort(params.get('sort')),
    comparisonType:
      params.get('type_id') === '2' ? SUBSCRIPTION_TYPE.ENTERPRISE : DEFAULT_COMPARISON_TYPE,
  };
}

/** The inverse of `parseSubscriptionsSearchParams`: what is the default is left out of the address. */
export function toSubscriptionsSearchParams(location: SubscriptionsLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.page !== 1) {
    params.set('page', String(location.page));
  }
  if (location.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('page_size', String(location.pageSize));
  }
  if (location.tab !== DEFAULT_SUBSCRIPTIONS_TAB) {
    params.set('tab', location.tab);
  }
  const sort = serializeSort(location.sort);
  if (sort !== null) {
    params.set('sort', sort);
  }
  if (location.comparisonType === SUBSCRIPTION_TYPE.ENTERPRISE) {
    params.set('type_id', '2');
  }
  return params;
}

/** The id of a subscription in the address (`/subscriptions/:subscriptionId`), or `null`. */
export function parseSubscriptionId(value: string | undefined): number | null {
  const parsed = subscriptionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
