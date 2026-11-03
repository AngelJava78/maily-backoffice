import { useQueryClient } from '@tanstack/react-query';

import type { Role } from '../schemas/role';
import {
  locationAfterCreate,
  locationSearch,
  type RolePermissionsLocation,
} from '../schemas/rolePermissionsLocation';
import { roleKeys } from './roleKeys';

export interface RevealedRole {
  /** The state of the table that shows the role. */
  readonly location: RolePermissionsLocation;
  /** The same state as the search of its address (`?type=sistema&page=2`, or empty for the defaults). */
  readonly search: string;
}

/**
 * The table that shows a role just created or duplicated (feature 027, FR-017, research D7): what
 * the person is taken back to from the detail of the new role, both with «Volver al listado» and
 * with the Back button. The list of active roles is read from the cache of queries when the function
 * is called, in an event handler and never while rendering: by then the mutation has already waited
 * for the lists to refresh, so the new role is in it, and nothing is copied into a state of its own.
 */
export function useRevealRole() {
  const queryClient = useQueryClient();

  return (
    location: RolePermissionsLocation,
    role: { readonly id: number; readonly type: { readonly id: 1 | 2 } },
  ): RevealedRole => {
    const activeRoles = queryClient.getQueryData<Role[]>(roleKeys.list('active')) ?? [];
    const revealed = locationAfterCreate(location, role, activeRoles);
    return { location: revealed, search: locationSearch(revealed) };
  };
}
