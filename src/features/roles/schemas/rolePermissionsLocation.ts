import { z } from 'zod';

import { messages } from '@/shared/messages/es';

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** The two filters of the section (feature 025, research D2): Todos and Activos are the defaults. */
export type RolesTypeFilter = 'all' | 'system' | 'clinic';
export type RolesStatusFilter = 'active' | 'blocked';

/** The `type.id` the API uses for each type filter but Todos (1 Sistema, 2 Clínica). */
export const ROLE_TYPE_ID_OF_FILTER: Record<Exclude<RolesTypeFilter, 'all'>, 1 | 2> = {
  system: 1,
  clinic: 2,
};

/** The inverse of `ROLE_TYPE_ID_OF_FILTER`: the filter that shows only the roles of this type. */
export function typeFilterOfRoleTypeId(typeId: 1 | 2): Exclude<RolesTypeFilter, 'all'> {
  return typeId === 1 ? 'system' : 'clinic';
}

/**
 * What the address of `/roles` asks for (constitution III; feature 027, research D3): both filters
 * and the page of the table with its size. Which role is open is no longer part of it: a role has
 * its own address (`/roles/:roleId`).
 */
export interface RolePermissionsLocation {
  readonly type: RolesTypeFilter;
  readonly status: RolesStatusFilter;
  /** Counted from 1, as the address writes it. */
  readonly page: number;
  readonly pageSize: PageSize;
}

// The values of the address are the ones the old Clínica/Sistema tabs already wrote (feature 025,
// FR-009), so a link saved before is still the canonical form. Only this file knows them.
const TYPE_IN_ADDRESS = { system: 'sistema', clinic: 'clinica' } as const;
const BLOCKED_IN_ADDRESS = 'bloqueados';

/** A positive whole number written with digits only; nothing else is read as a number. */
const positiveIntegerText = z
  .string()
  .regex(/^[1-9]\d{0,14}$/)
  .transform(Number);

// An invalid value is replaced by the default one: an address that someone edited by hand still opens.
const typeSchema = z
  .enum(['sistema', 'clinica'])
  .transform((value): RolesTypeFilter => (value === 'sistema' ? 'system' : 'clinic'))
  .catch('all');
const statusSchema = z
  .literal(BLOCKED_IN_ADDRESS)
  .transform((): RolesStatusFilter => 'blocked')
  .catch('active');
const pageSchema = positiveIntegerText.catch(1);
const pageSizeSchema = positiveIntegerText
  .pipe(z.literal(PAGE_SIZE_OPTIONS))
  .catch(DEFAULT_PAGE_SIZE);
// Digits without leading zeros: "007" is not the address of role 7.
const roleIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number);

/** The state of the table written in `search`; the page of the address starts at 1. Never throws. */
export function parseRolePermissionsSearchParams(params: URLSearchParams): RolePermissionsLocation {
  return {
    type: typeSchema.parse(params.get('type') ?? undefined),
    status: statusSchema.parse(params.get('status') ?? undefined),
    page: pageSchema.parse(params.get('page') ?? undefined),
    pageSize: pageSizeSchema.parse(params.get('page_size') ?? undefined),
  };
}

/** The inverse of `parseRolePermissionsSearchParams`: what is the default is left out of the address. */
export function toRolePermissionsSearchParams(location: RolePermissionsLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.type !== 'all') {
    params.set('type', TYPE_IN_ADDRESS[location.type]);
  }
  if (location.status === 'blocked') {
    params.set('status', BLOCKED_IN_ADDRESS);
  }
  if (location.page !== 1) {
    params.set('page', String(location.page));
  }
  if (location.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('page_size', String(location.pageSize));
  }
  return params;
}

/**
 * The search of the table as an address writes it (`?type=sistema&page=2`, or an empty text), which
 * is what travels to the detail of a role to come back to the same table (research D6).
 */
export function locationSearch(location: RolePermissionsLocation): string {
  const query = toRolePermissionsSearchParams(location).toString();
  return query === '' ? '' : `?${query}`;
}

/**
 * The role an address from before feature 027 asked to open (`/roles?roleId=7`), or `null`. Those
 * links now lead to the detail of the role (FR-019); an id that is not valid is ignored.
 */
export function legacyRoleIdOf(params: URLSearchParams): number | null {
  const roleId = roleIdSchema.safeParse(params.get('roleId') ?? undefined);
  return roleId.success ? roleId.data : null;
}

/** The id of a role in the address (`/roles/:roleId`), or `null` when it is not one. */
export function parseRoleId(value: string | undefined): number | null {
  const roleId = roleIdSchema.safeParse(value);
  return roleId.success ? roleId.data : null;
}

/** The roles of `roles` the type filter shows, in the same order (the API already sorts by name). */
export function rolesOfType<R extends { readonly type: { readonly id: 1 | 2 } }>(
  roles: readonly R[],
  type: RolesTypeFilter,
): R[] {
  return type === 'all'
    ? [...roles]
    : roles.filter((role) => role.type.id === ROLE_TYPE_ID_OF_FILTER[type]);
}

/** The last page of a list of `total` roles: 1 even when there are none. */
export function lastPageOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The rows of one page (counted from 1) of the roles the filters show (research D4). */
export function pageOfRoles<R>(roles: readonly R[], page: number, pageSize: number): R[] {
  return roles.slice((page - 1) * pageSize, page * pageSize);
}

/** The page (counted from 1) where a role is in `roles`, or the first one when it is not there. */
export function pageOfRole(
  roles: readonly { readonly id: number }[],
  roleId: number,
  pageSize: number,
): number {
  const index = roles.findIndex((role) => role.id === roleId);
  return index === -1 ? 1 : Math.floor(index / pageSize) + 1;
}

/**
 * The table that shows a role just created or duplicated (FR-017, research D7): the new role is
 * born active, so Estatus switches to Activos; Tipo only changes when it would hide the new role;
 * and the page is the one where the role is among the active roles of that type.
 */
export function locationAfterCreate<
  R extends { readonly id: number; readonly type: { readonly id: 1 | 2 } },
>(location: RolePermissionsLocation, role: R, activeRoles: readonly R[]): RolePermissionsLocation {
  const shows = rolesOfType([role], location.type).length > 0;
  const type = shows ? location.type : typeFilterOfRoleTypeId(role.type.id);
  return {
    type,
    status: 'active',
    page: pageOfRole(rolesOfType(activeRoles, type), role.id, location.pageSize),
    pageSize: location.pageSize,
  };
}

/** What the table says when no role answers the filters (FR-009, data-model §3). */
export function emptyRolesMessage(type: RolesTypeFilter, status: RolesStatusFilter): string {
  const text = messages.roles.list;
  if (status === 'blocked') {
    return text.emptyBlocked;
  }
  if (type === 'system') {
    return text.emptySistema;
  }
  return type === 'clinic' ? text.emptyClinica : text.emptyAll;
}
