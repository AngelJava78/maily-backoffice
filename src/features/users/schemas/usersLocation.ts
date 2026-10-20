import { z } from 'zod';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * What the address of the list asks for (constitution III: the state that can be navigated lives in
 * the URL). A search by email wins over the page and the page size, which it does not use.
 */
export type UsersLocation =
  | { readonly mode: 'list'; readonly page: number; readonly pageSize: PageSize }
  | { readonly mode: 'search'; readonly email: string };

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
const searchEmailSchema = z.string().trim().min(1);
// 8-4-4-4-12 hexadecimal digits, like the users service accepts it; lower case, as the service returns it.
const userIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  .transform((value) => value.toLowerCase());

/** The state of the list written in `search`; the page of the URL starts at 1. Never throws. */
export function parseUsersSearchParams(params: URLSearchParams): UsersLocation {
  const email = searchEmailSchema.safeParse(params.get('email') ?? undefined);
  if (email.success) {
    return { mode: 'search', email: email.data };
  }
  return {
    mode: 'list',
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('page_size') ?? undefined),
  };
}

/** The inverse of `parseUsersSearchParams`: what is the default is left out of the address. */
export function toUsersSearchParams(location: UsersLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.mode === 'search') {
    params.set('email', location.email);
    return params;
  }
  if (location.page !== 1) {
    params.set('page', String(location.page));
  }
  if (location.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('page_size', String(location.pageSize));
  }
  return params;
}

/** The id of a user in the address (`/users/:userId`), or `null` when it is not one. */
export function parseUserId(value: string | undefined): string | null {
  const parsed = userIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
