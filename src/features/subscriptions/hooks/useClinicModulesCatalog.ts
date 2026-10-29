import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { listClinicModules } from '../api/clinicModulesApi';
import type { ClinicModule } from '../schemas/clinicModule';
import { clinicModuleKeys } from './clinicModuleKeys';

const CATALOG_STALE_TIME_MS = 5 * 60 * 1_000;

/**
 * The vigente catalog of active clinic modules (021, FR-001, FR-002); asked once per screen
 * (Assumptions: no need to refresh it while the form stays open). Both the create and the edit
 * screens always need it, so there is no `enabled` option (unlike `useRolesCatalog`).
 */
export function useClinicModulesCatalog(): UseQueryResult<ClinicModule[]> {
  const { users } = useHttpClients();
  return useQuery({
    queryKey: clinicModuleKeys.catalog(),
    queryFn: ({ signal }) => listClinicModules(users, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
