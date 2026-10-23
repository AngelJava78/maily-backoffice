import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listModules } from '../api/modulesApi';
import { MODULE_STATUS, type ModuleStatusId } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { moduleKeys } from './moduleKeys';

/**
 * The modules of one status (Activos or Bloqueados), each with its actions. Changing the type
 * filter or the search text never asks again: both are applied on this same result (research D6).
 */
export function useModulesCatalog(
  statusId: ModuleStatusId = MODULE_STATUS.ACTIVE,
): UseQueryResult<readonly SystemModule[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: moduleKeys.catalog(statusId),
    queryFn: ({ signal }) => listModules(users, { statusId, signal }),
  });
}
