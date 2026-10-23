import type { ModuleStatusId } from '../schemas/moduleActionCatalog';

/**
 * The TanStack Query keys of the modules catalog (constitution III). The status filter is a server
 * parameter (research D6): a different status is a different key, so changing it fetches again,
 * while the type filter and the search are client-side and do not need their own key.
 */
export const moduleKeys = {
  all: ['modules'] as const,
  catalog: (statusId: ModuleStatusId) => [...moduleKeys.all, 'catalog', statusId] as const,
};
