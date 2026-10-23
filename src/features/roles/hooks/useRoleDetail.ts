import { useQuery } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRolePermissions } from '../api/rolePermissionsApi';
import type { Role } from '../schemas/role';
import { roleKeys } from './roleKeys';
import { useRolesCatalog } from './useRolesCatalog';

export interface RoleDetailData {
  readonly role: Role;
  readonly grantedPermissionIds: ReadonlySet<number>;
}

export interface UseRoleDetailResult {
  readonly data: RoleDetailData | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

/**
 * The role selected (`roleId`, from the URL) and its currently granted permission ids. The role
 * itself comes from the already-cached roles catalog (`useRolesCatalog`), not a second network
 * call: the list and the detail are the same data (FR-005). A role no longer in the catalog (just
 * deleted, by this person or someone else) gives no data without being an error.
 */
export function useRoleDetail(roleId: number | null): UseRoleDetailResult {
  const { users } = useHttpClients();
  const rolesQuery = useRolesCatalog();
  const role: Role | undefined =
    roleId === null ? undefined : rolesQuery.data?.find((candidate) => candidate.id === roleId);

  const permissionsQuery = useQuery({
    queryKey: roleKeys.permissions(roleId ?? 0),
    queryFn: ({ signal }) => {
      if (roleId === null) {
        return Promise.resolve([]);
      }
      return listRolePermissions(users, roleId, { signal });
    },
    enabled: role !== undefined,
  });

  if (roleId === null) {
    return { data: undefined, isLoading: false, isError: false, error: null };
  }
  if (rolesQuery.isLoading) {
    return { data: undefined, isLoading: true, isError: false, error: null };
  }
  if (rolesQuery.isError) {
    return { data: undefined, isLoading: false, isError: true, error: rolesQuery.error };
  }
  if (role === undefined) {
    return { data: undefined, isLoading: false, isError: false, error: null };
  }
  if (permissionsQuery.isLoading) {
    return { data: undefined, isLoading: true, isError: false, error: null };
  }
  if (permissionsQuery.isError) {
    return { data: undefined, isLoading: false, isError: true, error: permissionsQuery.error };
  }
  return {
    data: {
      role,
      grantedPermissionIds: new Set(
        (permissionsQuery.data ?? []).map((permission) => permission.id),
      ),
    },
    isLoading: false,
    isError: false,
    error: null,
  };
}
