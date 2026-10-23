import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listModules } from '../api/modulesApi';
import type { Module } from '../schemas/module';
import { modulesCatalogKeys } from './roleKeys';

const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/** The active modules of `typeId` (`modules:read`): the rows of that type's permission matrix. */
export function useModulesCatalog(typeId: 1 | 2): UseQueryResult<Module[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: modulesCatalogKeys.byType(typeId),
    queryFn: ({ signal }) => listModules(users, typeId, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
