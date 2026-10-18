import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listUserRoles } from '../api/userRolesApi';
import type { Role } from '../schemas/role';
import { userKeys } from './userKeys';

/**
 * The active roles of a user. The service only answers for an active user, so the caller enables
 * the query only then (FR-019): for any other status it answers 409.
 */
export function useUserRoles(
  userId: number,
  { enabled }: { readonly enabled: boolean },
): UseQueryResult<Role[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: userKeys.roles(userId),
    queryFn: ({ signal }) => listUserRoles(users, userId, { signal }),
    enabled,
  });
}
