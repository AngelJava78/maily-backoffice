import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRoles } from '../api/rolesApi';
import type { Role } from '../schemas/role';
import { roleKeys } from './roleKeys';

/** Every active role, of both types (the caller separates them by `type.id` for each tab). */
export function useRolesCatalog(): UseQueryResult<Role[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: ({ signal }) => listRoles(users, { signal }),
  });
}
