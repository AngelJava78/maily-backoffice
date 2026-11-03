import type { UseQueryResult } from '@tanstack/react-query';

import type { Role } from '../schemas/role';
import { rolesOfType } from '../schemas/rolePermissionsLocation';
import { useRolePermissionsLocation } from './useRolePermissionsLocation';
import { useRolesCatalog } from './useRolesCatalog';

export interface VisibleRoles {
  /** The list of the Estatus filter, as it comes from the service (loading, error, refetch...). */
  readonly query: UseQueryResult<Role[]>;
  /** The roles of that list the Tipo filter shows (FR-005), in the order of the service. */
  readonly roles: readonly Role[];
}

/** The roles both filters of the address show (feature 025, research D3). */
export function useVisibleRoles(): VisibleRoles {
  const { location } = useRolePermissionsLocation();
  const query = useRolesCatalog(location.status);
  return { query, roles: rolesOfType(query.data ?? [], location.type) };
}
