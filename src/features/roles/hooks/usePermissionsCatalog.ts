import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listPermissions } from '../api/permissionsApi';
import type { Permission } from '../schemas/permission';
import { permissionsCatalogKeys } from './roleKeys';

/** The catalog changes rarely: read again after five minutes, not on every screen. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/** The whole catalog of permissions, shared by every role's matrix (`permissions:read`). */
export function usePermissionsCatalog(): UseQueryResult<Permission[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: permissionsCatalogKeys.all,
    queryFn: ({ signal }) => listPermissions(users, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
