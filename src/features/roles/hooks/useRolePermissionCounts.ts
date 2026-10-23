import { useQueries } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRolePermissions } from '../api/rolePermissionsApi';
import { roleKeys } from './roleKeys';

/**
 * How many permissions each role of `roleIds` currently has (FR-004, the list's "X permisos").
 * One query per role, sharing its cache and query key with `useRoleDetail` — opening a role's
 * detail does not ask for its permissions twice, and a count already known from the list is
 * already warm by the time its detail opens.
 */
export function useRolePermissionCounts(roleIds: readonly number[]): ReadonlyMap<number, number> {
  const { users } = useHttpClients();
  const results = useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: roleKeys.permissions(roleId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listRolePermissions(users, roleId, { signal }),
    })),
  });

  const counts = new Map<number, number>();
  roleIds.forEach((roleId, index) => {
    const data = results[index]?.data;
    if (data !== undefined) {
      counts.set(roleId, data.length);
    }
  });
  return counts;
}
