import { z } from 'zod';

import type { Role } from './role';

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
 * What the address of `/roles` asks for (constitution III; research D2): both filters and which
 * role is selected. There is no list to paginate, so this is all there is.
 */
export interface RolePermissionsLocation {
  readonly type: RolesTypeFilter;
  readonly status: RolesStatusFilter;
  readonly roleId: number | null;
}

// The values of the address are the ones the old Clínica/Sistema tabs already wrote (FR-009), so a
// link saved before feature 025 is still the canonical form. Only this file knows them.
const TYPE_IN_ADDRESS = { system: 'sistema', clinic: 'clinica' } as const;
const BLOCKED_IN_ADDRESS = 'bloqueados';

// An invalid value is replaced by the default one: an address that someone edited by hand still opens.
const typeSchema = z
  .enum(['sistema', 'clinica'])
  .transform((value): RolesTypeFilter => (value === 'sistema' ? 'system' : 'clinic'))
  .catch('all');
const statusSchema = z
  .literal(BLOCKED_IN_ADDRESS)
  .transform((): RolesStatusFilter => 'blocked')
  .catch('active');
// Digits without leading zeros: "007" is not the address of role 7.
const roleIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number);

/** The state of the screen written in `search`. Never throws. */
export function parseRolePermissionsSearchParams(params: URLSearchParams): RolePermissionsLocation {
  const roleId = roleIdSchema.safeParse(params.get('roleId') ?? undefined);
  return {
    type: typeSchema.parse(params.get('type') ?? undefined),
    status: statusSchema.parse(params.get('status') ?? undefined),
    roleId: roleId.success ? roleId.data : null,
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
  if (location.roleId !== null) {
    params.set('roleId', String(location.roleId));
  }
  return params;
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

/**
 * Where the screen goes once a role is created or duplicated (FR-010): the new role is born active,
 * so Estatus switches to Activos, and Tipo only changes when it would hide the new role.
 */
export function locationAfterCreate(
  location: RolePermissionsLocation,
  role: { readonly id: number; readonly type: { readonly id: 1 | 2 } },
): RolePermissionsLocation {
  const shows = rolesOfType([role], location.type).length > 0;
  return {
    type: shows ? location.type : typeFilterOfRoleTypeId(role.type.id),
    status: 'active',
    roleId: role.id,
  };
}

/** What the right-hand side of the screen shows (data-model §4). */
export type RoleDetailView =
  | { readonly kind: 'none' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'active'; readonly roleId: number }
  | { readonly kind: 'blocked'; readonly role: Role };

/**
 * Decides the detail from the address and the list the filters show (research D4). A role the
 * filters do not show is not opened (FR-011) — unless it is an active role that was already open
 * and has just disappeared (someone else deleted or blocked it): then the usual detail stays, with
 * its own "no longer exists" handling (edge case of spec.md).
 */
export function detailOf({
  location,
  isLoading,
  visibleRoles,
  lastShownRoleId,
}: {
  readonly location: RolePermissionsLocation;
  readonly isLoading: boolean;
  readonly visibleRoles: readonly Role[];
  readonly lastShownRoleId: number | null;
}): RoleDetailView {
  const { roleId, status } = location;
  if (roleId === null) {
    return { kind: 'none' };
  }
  if (isLoading) {
    return { kind: 'loading' };
  }
  const role = visibleRoles.find((candidate) => candidate.id === roleId);
  if (role !== undefined) {
    return status === 'active' ? { kind: 'active', roleId } : { kind: 'blocked', role };
  }
  if (status === 'active' && lastShownRoleId === roleId) {
    return { kind: 'active', roleId };
  }
  return { kind: 'none' };
}
