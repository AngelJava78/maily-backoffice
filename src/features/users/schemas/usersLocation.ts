import { z } from 'zod';

import { messages } from '@/shared/messages/es';

import { USER_STATUS } from './userStatus';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** The two filters of the list (feature 026): Todos and Activos are the defaults (FR-004). */
export type UsersTypeFilter = 'all' | 'system' | 'clinic';
export type UsersStatusFilter = 'active' | 'blocked';

/** The `role_type_id` the users service takes for each type filter but Todos (1 Sistema, 2 Clínica). */
export const ROLE_TYPE_ID_OF_USERS_FILTER = { system: 1, clinic: 2 } as const satisfies Record<
  Exclude<UsersTypeFilter, 'all'>,
  number
>;

/** The `status_id` the users service takes for each status filter; deleted users are never listed. */
export const STATUS_ID_OF_USERS_FILTER = {
  active: USER_STATUS.ACTIVE,
  blocked: USER_STATUS.BLOCKED,
} as const satisfies Record<UsersStatusFilter, number>;

/**
 * What the address of the list asks for (constitution III: the state that can be navigated lives in
 * the URL). A search by email wins over the page and the page size, which it does not use; the
 * filters are kept in both, so that leaving the search goes back to the same filters (FR-011).
 */
export type UsersLocation =
  | {
      readonly mode: 'list';
      readonly page: number;
      readonly pageSize: PageSize;
      readonly type: UsersTypeFilter;
      readonly status: UsersStatusFilter;
    }
  | {
      readonly mode: 'search';
      readonly email: string;
      readonly type: UsersTypeFilter;
      readonly status: UsersStatusFilter;
    };

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
// The same names and values as the address of Módulos and as the API (research D3).
const typeSchema = z
  .enum(['1', '2'])
  .transform((value): UsersTypeFilter => (value === '1' ? 'system' : 'clinic'))
  .catch('all');
const statusSchema = z
  .literal('2')
  .transform((): UsersStatusFilter => 'blocked')
  .catch('active');
const searchEmailSchema = z.string().trim().min(1);
// 8-4-4-4-12 hexadecimal digits, like the users service accepts it; lower case, as the service returns it.
const userIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  .transform((value) => value.toLowerCase());

/** The state of the list written in `search`; the page of the URL starts at 1. Never throws. */
export function parseUsersSearchParams(params: URLSearchParams): UsersLocation {
  const filters = {
    type: typeSchema.parse(params.get('type_id') ?? undefined),
    status: statusSchema.parse(params.get('status_id') ?? undefined),
  };
  const email = searchEmailSchema.safeParse(params.get('email') ?? undefined);
  if (email.success) {
    return { mode: 'search', email: email.data, ...filters };
  }
  return {
    mode: 'list',
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('page_size') ?? undefined),
    ...filters,
  };
}

/** The inverse of `parseUsersSearchParams`: what is the default is left out of the address. */
export function toUsersSearchParams(location: UsersLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.mode === 'search') {
    params.set('email', location.email);
  }
  if (location.type !== 'all') {
    params.set('type_id', String(ROLE_TYPE_ID_OF_USERS_FILTER[location.type]));
  }
  if (location.status === 'blocked') {
    params.set('status_id', String(STATUS_ID_OF_USERS_FILTER.blocked));
  }
  if (location.mode === 'search') {
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

/** What the list says when no user answers the filters (FR-013, research D10). */
export function emptyUsersMessage(type: UsersTypeFilter, status: UsersStatusFilter): string {
  const text = messages.users.list;
  if (type === 'all') {
    return status === 'active' ? text.empty : text.emptyBlocked;
  }
  const typeName = messages.users.filters.type[type];
  return status === 'active' ? text.emptyActiveOfType(typeName) : text.emptyBlockedOfType(typeName);
}

/** The id of a user in the address (`/users/:userId`), or `null` when it is not one. */
export function parseUserId(value: string | undefined): string | null {
  const parsed = userIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
