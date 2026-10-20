import { z } from 'zod';

import { MAX_SUBSCRIPTION_ID } from './subscription';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * What the address of the list asks for (constitution III: the state that can be navigated lives in
 * the URL). The order is fixed and there is no search, so the page and its size are all there is.
 */
export interface SubscriptionsLocation {
  readonly page: number;
  readonly pageSize: PageSize;
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
// Digits without leading zeros, up to the largest id of the API: "007" is not the address of 7.
const subscriptionIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number)
  .pipe(z.number().max(MAX_SUBSCRIPTION_ID));

/** The state of the list written in `search`; the page of the URL starts at 1. Never throws. */
export function parseSubscriptionsSearchParams(params: URLSearchParams): SubscriptionsLocation {
  return {
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('page_size') ?? undefined),
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
  return params;
}

/** The id of a subscription in the address (`/subscriptions/:subscriptionId`), or `null`. */
export function parseSubscriptionId(value: string | undefined): number | null {
  const parsed = subscriptionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
