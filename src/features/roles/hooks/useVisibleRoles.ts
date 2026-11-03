import type { UseQueryResult } from '@tanstack/react-query';

import type { Role } from '../schemas/role';
import {
  rolesOfType,
  type RolesStatusFilter,
  type RolesTypeFilter,
} from '../schemas/rolePermissionsLocation';
import { useRolesCatalog } from './useRolesCatalog';

export interface VisibleRoles {
  /** The list of the Estatus filter, as it comes from the service (loading, error, refetch...). */
  readonly query: UseQueryResult<Role[]>;
  /** The roles of that list the Tipo filter shows (FR-007), in the order of the service. */
  readonly roles: readonly Role[];
}

/** The roles both filters of the table show (features 025 and 027, research D3 and D4). */
export function useVisibleRoles({
  type,
  status,
}: {
  readonly type: RolesTypeFilter;
  readonly status: RolesStatusFilter;
}): VisibleRoles {
  const query = useRolesCatalog(status);
  return { query, roles: rolesOfType(query.data ?? [], type) };
}
