import { z } from 'zod';

/** The two tabs of the section (research D5): Clínica is the default. */
export const ROLE_TYPE_TABS = ['clinica', 'sistema'] as const;
export const DEFAULT_ROLE_TYPE_TAB = 'clinica';

export type RoleTypeTab = (typeof ROLE_TYPE_TABS)[number];

/** The `type.id` the API uses for each tab (1 Sistema, 2 Clínica). */
export const ROLE_TYPE_ID_OF_TAB: Record<RoleTypeTab, 1 | 2> = { clinica: 2, sistema: 1 };

/**
 * What the address of `/roles` asks for (constitution III; research D5): which tab is active and
 * which role is selected within it. There is no list to paginate, so this is all there is.
 */
export interface RolePermissionsLocation {
  readonly type: RoleTypeTab;
  readonly roleId: number | null;
}

// An invalid value is replaced by the default one: an address that someone edited by hand still opens.
const tabSchema = z.literal(ROLE_TYPE_TABS).catch(DEFAULT_ROLE_TYPE_TAB);
// Digits without leading zeros: "007" is not the address of role 7.
const roleIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number);

/** The state of the screen written in `search`. Never throws. */
export function parseRolePermissionsSearchParams(params: URLSearchParams): RolePermissionsLocation {
  const roleId = roleIdSchema.safeParse(params.get('roleId') ?? undefined);
  return {
    type: tabSchema.parse(params.get('type') ?? undefined),
    roleId: roleId.success ? roleId.data : null,
  };
}

/** The inverse of `parseRolePermissionsSearchParams`: what is the default is left out of the address. */
export function toRolePermissionsSearchParams(location: RolePermissionsLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.type !== DEFAULT_ROLE_TYPE_TAB) {
    params.set('type', location.type);
  }
  if (location.roleId !== null) {
    params.set('roleId', String(location.roleId));
  }
  return params;
}
