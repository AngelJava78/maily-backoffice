import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listRoleTypes, type RoleType } from '../api/roleTypesApi';
import { roleTypesCatalogKeys } from './roleKeys';

const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/** The fixed catalog of role types (Clínica/Sistema), for the type selector of the alta form. */
export function useRoleTypes(): UseQueryResult<RoleType[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: roleTypesCatalogKeys.all,
    queryFn: ({ signal }) => listRoleTypes(users, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
