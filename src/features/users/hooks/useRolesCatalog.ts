import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRoles } from '../api/rolesApi';
import type { Role } from '../schemas/role';
import { roleKeys } from './userKeys';

/** The catalog changes rarely, so it is read again after five minutes, not on every screen. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/**
 * The roles that can be assigned. It is asked only when a screen needs it (creating a user or
 * adding a role), which is what `enabled` says, so the service is not asked for it otherwise.
 */
export function useRolesCatalog({
  enabled,
}: {
  readonly enabled: boolean;
}): UseQueryResult<Role[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: roleKeys.catalog(),
    queryFn: ({ signal }) => listRoles(users, { signal }),
    enabled,
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
