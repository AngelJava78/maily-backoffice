import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRoles } from '../api/rolesApi';
import type { Role } from '../schemas/role';
import type { RolesStatusFilter } from '../schemas/rolePermissionsLocation';
import { roleKeys } from './roleKeys';

/**
 * Every role of a status (the active ones unless asked otherwise), of both types: the caller
 * separates them by `type.id` when the Tipo filter asks for it (research D3).
 */
export function useRolesCatalog(status: RolesStatusFilter = 'active'): UseQueryResult<Role[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: roleKeys.list(status),
    queryFn: ({ signal }) => listRoles(users, { statusId: status === 'blocked' ? 2 : 1, signal }),
  });
}
