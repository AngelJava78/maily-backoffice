import { z } from 'zod';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * What the address of the registry asks for (FR-034; constitution III: the state that can be
 * navigated lives in the URL): the page and its size, as `?page=` and `?pageSize=`.
 */
export interface ComponentsLocation {
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

/** The state of the list written in `search`; the page of the URL starts at 1. Never throws. */
export function parseComponentsSearchParams(params: URLSearchParams): ComponentsLocation {
  return {
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('pageSize') ?? undefined),
  };
}

/** The inverse of `parseComponentsSearchParams`: what is the default is left out of the address. */
export function toComponentsSearchParams(location: ComponentsLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.page !== 1) {
    params.set('page', String(location.page));
  }
  if (location.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(location.pageSize));
  }
  return params;
}
